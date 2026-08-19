package stack

import (
	"context"
	"strings"

	"github.com/Stackdome/stackdome/pkg/errors"
	"github.com/Stackdome/stackdome/pkg/models"
	"github.com/Stackdome/stackdome/pkg/validator"
	"go.uber.org/mock/gomock"

	"github.com/Stackdome/stackdome/pkg/mocks"
	. "github.com/onsi/ginkgo/v2"
	. "github.com/onsi/gomega"
)

// The Ginkgo specs build their own validator: newTestValidator takes a
// *testing.T for gomock's controller, and a spec has no T to hand it.
func ginkgoValidator() validator.StackValidator {
	ctrl := gomock.NewController(GinkgoT())
	DeferCleanup(ctrl.Finish)

	resourceValidator := mocks.NewMockValidator(ctrl)
	resourceValidator.EXPECT().
		Validate(gomock.Any(), gomock.Any(), gomock.Any(), gomock.Any()).
		Return(nil, nil).
		AnyTimes()

	return NewStackValidator(StackValidatorSpec{ResourceValidator: resourceValidator})
}

func namedStack(name string) *models.Stack {
	return &models.Stack{
		Name:           name,
		OrganisationID: "org-1",
		UserID:         "user-1",
		ProjectID:      "project-1",
	}
}

// renamed returns the pair ValidateShell takes: the stack as stored, and the
// same stack with a new name.
func renamed(from, to string) (*models.Stack, *models.Stack) {
	existing := namedStack(from)
	spec := namedStack(to)
	return existing, spec
}

// Field errors ride in Details as a ValidationErrorDetails, not as a field on
// ServiceError — ValidationFailed wraps them with WithDetails.
func nameErrors(err *errors.ServiceError) []errors.FieldError {
	if err == nil {
		return nil
	}
	details, ok := err.Details.(errors.ValidationErrorDetails)
	if !ok {
		return nil
	}
	var out []errors.FieldError
	for _, fe := range details.Errors {
		if fe.Field == fieldName {
			out = append(out, fe)
		}
	}
	return out
}

var _ = Describe("Renaming a stack", func() {
	// A stack was the only entity in the product that could not be renamed —
	// a project can, and so can every resource inside a stack. The rule was
	// written when the cluster Stack CR (keyed by the name) would have been
	// orphaned by a rename; the apply reconciler now prunes it by
	// LabelStackID, the same way it already prunes renamed resources.
	Context("through the shell-update path a rename actually arrives on", func() {
		It("accepts a valid new name", func() {
			existing, spec := renamed("orders-api", "checkout-api")

			Expect(ginkgoValidator().ValidateShell(context.Background(), existing, spec)).To(BeNil())
		})

		It("rejects a new name that breaks the DNS-label charset", func() {
			existing, spec := renamed("orders-api", "Checkout API")

			err := ginkgoValidator().ValidateShell(context.Background(), existing, spec)

			Expect(err).NotTo(BeNil())
			Expect(nameErrors(err)).To(HaveLen(1))
			Expect(nameErrors(err)[0].Code).To(Equal(errors.VErrStackNameInvalid))
		})

		It("rejects a new name that would leave too little room for the namespace uuid", func() {
			existing, spec := renamed("orders-api", strings.Repeat("a", models.MaxStackNameLength+1))

			err := ginkgoValidator().ValidateShell(context.Background(), existing, spec)

			Expect(nameErrors(err)).To(HaveLen(1))
		})

		It("rejects clearing the name", func() {
			existing, spec := renamed("orders-api", "")

			Expect(ginkgoValidator().ValidateShell(context.Background(), existing, spec)).NotTo(BeNil())
		})

		// The point of checking only on change. A stack created before the
		// current name pattern must still be able to change its retention
		// settings; re-validating a name nobody touched would brick every
		// unrelated update to a legacy stack.
		It("says nothing about an unchanged name, however illegal", func() {
			legacy := namedStack("Legacy_Stack Name")
			spec := namedStack("Legacy_Stack Name")

			Expect(ginkgoValidator().ValidateShell(context.Background(), legacy, spec)).To(BeNil())
		})
	})

	Context("through the full update path", func() {
		It("accepts a valid new name", func() {
			existing, spec := renamed("orders-api", "checkout-api")

			Expect(ginkgoValidator().ValidateForUpdate(context.Background(), existing, spec)).To(BeNil())
		})

		It("rejects an invalid new name", func() {
			existing, spec := renamed("orders-api", "-leading-hyphen")

			Expect(nameErrors(ginkgoValidator().ValidateForUpdate(context.Background(), existing, spec))).To(HaveLen(1))
		})

		// Uniqueness is NOT this validator's job — it is network-free by
		// construction and cannot see the project's other stacks. The service
		// checks it against the store and the DB's unique index backstops it.
		It("does not attempt to police uniqueness", func() {
			existing, spec := renamed("orders-api", "some-other-stack")

			Expect(ginkgoValidator().ValidateForUpdate(context.Background(), existing, spec)).To(BeNil())
		})
	})
})
