package services

import (
	"context"
	"testing"

	"github.com/Stackdome/stackdome/pkg/errors"
	"github.com/Stackdome/stackdome/pkg/mocks"
	"github.com/Stackdome/stackdome/pkg/models"
	"github.com/stretchr/testify/assert"
	"go.uber.org/mock/gomock"
)

func TestStackShellFrom(t *testing.T) {
	spec := &models.Stack{
		Name: "demo",
		Volumes: []*models.Volume{
			{Name: "data"},
		},
		StackResources: []*models.StackResource{
			{Name: "web"},
		},
	}

	shell := stackShellFrom(spec)

	assert.Equal(t, "demo", shell.Name)
	assert.Nil(t, shell.Volumes)
	assert.Nil(t, shell.StackResources)
}

// TestInternalUpdateShellStack_RejectsInvalidSettings asserts the shell
// update path runs the shell-scoped stack validation: when the validator
// rejects the settings, nothing is written.
func TestInternalUpdateShellStack_RejectsInvalidSettings(t *testing.T) {
	ctx := context.Background()
	stackID := "stack-123"
	existing := &models.Stack{ID: stackID, Name: "demo"}
	spec := &models.Stack{
		Name:     "demo",
		Settings: &models.StackSettings{ReleaseRetentionLimit: models.MaxReleaseRetentionLimit + 1},
	}

	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockStackStore := mocks.NewMockStackStore(ctrl)
	mockValidator := mocks.NewMockStackValidator(ctrl)

	svc := &stackService{
		stackStore:     mockStackStore,
		stackValidator: mockValidator,
	}

	mockStackStore.EXPECT().GetByID(ctx, stackID).Return(existing, nil)
	verr := errors.ValidationFailed([]errors.FieldError{{
		Field: "spec.settings", Code: errors.VErrStackSettingsInvalid, Message: "release_retention_limit must be at most 50",
	}})
	// Three arguments since this branch gave ValidateShell the EXISTING stack to
	// compare the spec against; the production caller has passed three all along
	// and only this expectation lagged.
	mockValidator.EXPECT().ValidateShell(ctx, existing, spec).Return(verr)
	// No WithTransaction / UpdateShellWithTx expectations: any write attempt
	// fails via gomock's controller.

	got, serr := svc.InternalUpdateShellStack(ctx, stackID, spec)
	assert.Nil(t, got)
	assert.Equal(t, verr, serr)
}

// TestInternalUpdateShellStack_ValidSettings_Updates asserts the happy path:
// validation passes (on the child-stripped spec) and the shell is written.
func TestInternalUpdateShellStack_ValidSettings_Updates(t *testing.T) {
	ctx := context.Background()
	stackID := "stack-123"
	existing := &models.Stack{ID: stackID, Name: "demo", Namespace: "ns-demo"}
	spec := &models.Stack{
		Name:     "demo",
		Settings: &models.StackSettings{ReleaseRetentionLimit: 20, MinSuccessfulReleases: 5},
		StackResources: []*models.StackResource{
			{Name: "web"},
		},
	}

	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockStackStore := mocks.NewMockStackStore(ctrl)
	mockValidator := mocks.NewMockStackValidator(ctrl)

	svc := &stackService{
		stackStore:     mockStackStore,
		stackValidator: mockValidator,
	}

	mockStackStore.EXPECT().GetByID(ctx, stackID).Return(existing, nil)
	mockValidator.EXPECT().ValidateShell(ctx, existing, spec).
		DoAndReturn(func(_ context.Context, _ *models.Stack, got *models.Stack) *errors.ServiceError {
			// Children are stripped before validation; the shell path never
			// validates (or writes) them.
			assert.Nil(t, got.StackResources)
			assert.Nil(t, got.Volumes)
			assert.Nil(t, got.Connections)
			return nil
		})
	mockStackStore.EXPECT().WithTransaction(ctx, gomock.Any()).DoAndReturn(
		func(ctx context.Context, fn func(context.Context) *errors.ServiceError) *errors.ServiceError {
			return fn(ctx)
		})
	updated := &models.Stack{ID: stackID, Name: "demo"}
	mockStackStore.EXPECT().UpdateShellWithTx(ctx, stackID, spec).Return(updated, nil)

	got, serr := svc.InternalUpdateShellStack(ctx, stackID, spec)
	assert.Nil(t, serr)
	assert.Equal(t, updated, got)
}

// TestInternalUpdateShellStack_RenameOntoTakenName asserts a rename is refused
// when another stack in the project already holds the name.
//
// **This asserted the opposite until now** — that the name was immutable on the
// shell path — and it was still asserting it after the branch made a stack
// renameable, because it had never been run. Renaming is allowed; taking a
// sibling's name is not, and the refusal lands before validation or any write.
func TestInternalUpdateShellStack_RenameOntoTakenName(t *testing.T) {
	ctx := context.Background()
	stackID := "stack-123"
	existing := &models.Stack{ID: stackID, Name: "demo", Namespace: "ns-demo", ProjectID: "proj-1"}
	spec := &models.Stack{Name: "renamed"}

	ctrl := gomock.NewController(t)
	defer ctrl.Finish()

	mockStackStore := mocks.NewMockStackStore(ctrl)
	mockValidator := mocks.NewMockStackValidator(ctrl)

	svc := &stackService{
		stackStore:     mockStackStore,
		stackValidator: mockValidator,
	}

	mockStackStore.EXPECT().GetByID(ctx, stackID).Return(existing, nil)
	// A DIFFERENT stack already answers to the new name.
	mockStackStore.EXPECT().
		GetByNameAndProjectID(ctx, "renamed", "proj-1").
		Return(&models.Stack{ID: "stack-999", Name: "renamed"}, nil)
	// No ValidateShell / WithTransaction expectations: the conflict is caught
	// before validation and before any write.

	got, serr := svc.InternalUpdateShellStack(ctx, stackID, spec)
	assert.Nil(t, got)
	assert.NotNil(t, serr)
	assert.Contains(t, serr.Reason, "already exists")
}
