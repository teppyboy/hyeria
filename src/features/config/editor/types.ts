/** Values that can be represented in a JSON-compatible config document. */
export type JsonValue =
  | string
  | number
  | boolean
  | null
  | readonly JsonValue[]
  | { readonly [key: string]: JsonValue };

export type ConfigFieldKind = "boolean" | "text" | "number" | "select";

export interface ConfigFieldOption {
  readonly value: string;
  readonly labelKey: string;
}

interface ConfigFieldBase {
  readonly path: readonly string[];
  readonly labelKey: string;
  readonly descriptionKey: string;
  /** Registry entries are deliberately non-secret; secret-bearing settings are not registered. */
  readonly secret: false;
  readonly options?: readonly ConfigFieldOption[];
}

export interface BooleanConfigFieldDefinition extends ConfigFieldBase {
  readonly kind: "boolean";
}

export interface TextConfigFieldDefinition extends ConfigFieldBase {
  readonly kind: "text";
}

export interface NumberConfigFieldDefinition extends ConfigFieldBase {
  readonly kind: "number";
  readonly minimum?: number;
  readonly maximum?: number;
  readonly integer?: boolean;
}

export interface SelectConfigFieldDefinition extends ConfigFieldBase {
  readonly kind: "select";
  readonly options: readonly ConfigFieldOption[];
}

export type ConfigFieldDefinition =
  | BooleanConfigFieldDefinition
  | TextConfigFieldDefinition
  | NumberConfigFieldDefinition
  | SelectConfigFieldDefinition;

/** A scalar safe value keyed by its concrete dotted config path; absent fields are undefined. */
export type SafeConfigView = Readonly<Record<string, string | number | boolean | undefined>>;

/** An edit to one registered field. Undefined removes that field from the draft document. */
export interface ConfigEdit {
  readonly path: readonly string[];
  readonly value: JsonValue | undefined;
}

export type ConfigSectionId =
  | "management"
  | "requests"
  | "routing"
  | "observability"
  | "plugins"
  | "advanced-yaml";

export interface ConfigSectionDefinition {
  readonly id: ConfigSectionId;
  readonly labelKey: string;
  readonly descriptionKey: string;
}
