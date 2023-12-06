import { MethodSignature } from "./method";
import { ModelingStatus } from "./shared/modeling-status";

export type ModeledMethodType =
  | "none"
  | "source"
  | "sink"
  | "summary"
  | "type"
  | "neutral";

export type Provenance =
  // Generated by the dataflow model
  | "df-generated"
  // Generated by the dataflow model and manually edited
  | "df-manual"
  // Generated by the auto-model
  | "ai-generated"
  // Generated by the auto-model and manually edited
  | "ai-manual"
  // Entered by the user in the editor manually
  | "manual";

export interface NoneModeledMethod extends MethodSignature {
  readonly type: "none";
}

export interface SourceModeledMethod extends MethodSignature {
  readonly type: "source";
  readonly output: string;
  readonly kind: ModeledMethodKind;
  readonly provenance: Provenance;
}

export interface SinkModeledMethod extends MethodSignature {
  readonly type: "sink";
  readonly input: string;
  readonly kind: ModeledMethodKind;
  readonly provenance: Provenance;
}

export interface SummaryModeledMethod extends MethodSignature {
  readonly type: "summary";
  readonly input: string;
  readonly output: string;
  readonly kind: ModeledMethodKind;
  readonly provenance: Provenance;
}

export interface NeutralModeledMethod extends MethodSignature {
  readonly type: "neutral";
  readonly kind: ModeledMethodKind;
  readonly provenance: Provenance;
}

export interface TypeModeledMethod extends MethodSignature {
  readonly type: "type";
  readonly relatedTypeName: string;
  readonly path: string;
}

export type ModeledMethod =
  | NoneModeledMethod
  | SourceModeledMethod
  | SinkModeledMethod
  | SummaryModeledMethod
  | NeutralModeledMethod
  | TypeModeledMethod;

export type ModeledMethodKind = string;

export function modeledMethodSupportsKind(
  modeledMethod: ModeledMethod,
): modeledMethod is
  | SourceModeledMethod
  | SinkModeledMethod
  | SummaryModeledMethod
  | NeutralModeledMethod {
  return (
    modeledMethod.type === "source" ||
    modeledMethod.type === "sink" ||
    modeledMethod.type === "summary" ||
    modeledMethod.type === "neutral"
  );
}

export function modeledMethodSupportsInput(
  modeledMethod: ModeledMethod,
): modeledMethod is SinkModeledMethod | SummaryModeledMethod {
  return modeledMethod.type === "sink" || modeledMethod.type === "summary";
}

export function modeledMethodSupportsOutput(
  modeledMethod: ModeledMethod,
): modeledMethod is SourceModeledMethod | SummaryModeledMethod {
  return modeledMethod.type === "source" || modeledMethod.type === "summary";
}

export function modeledMethodSupportsProvenance(
  modeledMethod: ModeledMethod,
): modeledMethod is
  | SourceModeledMethod
  | SinkModeledMethod
  | SummaryModeledMethod
  | NeutralModeledMethod {
  return (
    modeledMethod.type === "source" ||
    modeledMethod.type === "sink" ||
    modeledMethod.type === "summary" ||
    modeledMethod.type === "neutral"
  );
}

export function isModelAccepted(
  modeledMethod: ModeledMethod | undefined,
  modelingStatus: ModelingStatus,
): boolean {
  if (!modeledMethod) {
    return true;
  }

  return (
    modelingStatus !== "unsaved" ||
    modeledMethod.type === "none" ||
    !modeledMethodSupportsProvenance(modeledMethod) ||
    modeledMethod.provenance !== "ai-generated"
  );
}

/**
 * Calculates the new provenance for a modeled method based on the current provenance.
 * @param modeledMethod The modeled method if there is one.
 * @returns The new provenance.
 */
export function calculateNewProvenance(
  modeledMethod: ModeledMethod | undefined,
) {
  if (!modeledMethod || !modeledMethodSupportsProvenance(modeledMethod)) {
    // If nothing has been modeled or the modeled method does not support
    // provenance, we assume that the user has entered it manually.
    return "manual";
  }

  switch (modeledMethod.provenance) {
    case "df-generated":
      // If the method has been generated and there has been a change, we assume
      // that the user has manually edited it.
      return "df-manual";
    case "df-manual":
      // If the method has had manual edits, we want the provenance to stay the same.
      return "df-manual";
    case "ai-generated":
      // If the method has been generated and there has been a change, we assume
      // that the user has manually edited it.
      return "ai-manual";
    case "ai-manual":
      // If the method has had manual edits, we want the provenance to stay the same.
      return "ai-manual";
    default:
      // The method has been modeled manually.
      return "manual";
  }
}