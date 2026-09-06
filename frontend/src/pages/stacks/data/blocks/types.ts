export type BlockCategory = "services" | "databases" | "analytics";

/** Categories whose blocks are internal dependencies (tcp ports, generated passwords). */
export const DATA_BLOCK_CATEGORIES: ReadonlySet<BlockCategory> = new Set(["databases", "analytics"]);

export interface BlockCategoryMeta {
  id: BlockCategory;
  label: string; //  marker label
}

export const BlockId = {
  Web: "web",
  Custom: "custom",
  Postgres: "postgres",
  Redis: "redis",
  Mysql: "mysql",
  Mongo: "mongo",
  Mariadb: "mariadb",
  Mssql: "mssql",
  Elasticsearch: "elasticsearch",
  Couchdb: "couchdb",
  Influxdb: "influxdb",
  Clickhouse: "clickhouse",
} as const;
export type BlockId = (typeof BlockId)[keyof typeof BlockId];

export interface BlockPreset {
  id: string;
  name: string;
  category: BlockCategory;
  icon: string;      // BlockGlyph key: a lucide name ("globe", "box") or a brand key ("postgres", "redis", "mysql", "mongo")
  summary: string;   // mono one-liner shown on the card, e.g. "postgres:16 · :5432 · pgdata"
  compose?: string;  // 1-service docker-compose YAML; omitted for generic blocks
  /**
   * This service can also be provisioned as a **managed add-on** — a database
   * Stackdome runs, backs up and upgrades, rather than a container in a stack.
   *
   * The addon catalogue is a filter over THIS registry, not a second list.
   * There used to be a hand-written one in the picker dialog, and it drifted
   * immediately: the same database shipped as "Postgres" here and "PostgreSQL"
   * there, and the other nine services did not exist as far as it knew.
   *
   * Absent means "not offered as a managed add-on **yet**", which is a
   * different thing from disabled — see `managedNote`.
   */
  managed?: boolean;
}
