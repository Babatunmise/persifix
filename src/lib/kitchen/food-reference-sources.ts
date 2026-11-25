import type { FoodReferenceSource } from "@/lib/kitchen/food-reference";

/**
 * Candidate source registry.
 *
 * These entries document source status; they do not load or publish data.
 * FoodOn remains blocked until release-level dependency and reuse review.
 * The FAO/INFOODS directory is discovery metadata, never an ingestible
 * food-composition dataset.
 */
export const FOOD_REFERENCE_SOURCES: readonly FoodReferenceSource[] = [
  {
    id: "foodon",
    name: "FoodOn Food Ontology",
    datasetVersion: "2026-09-20",
    licence: "CC BY 4.0 (repository declaration; dependency-level review pending)",
    sourceType: "ontology",
    qualityStatus: "review_required",
    useStatus: "review_required",
    attribution: "FoodOn Consortium, FoodOn Food Ontology, release 2026-09-20.",
    termsUrl: "https://github.com/FoodOntology/foodon/blob/master/LICENSE.txt",
  },
  {
    id: "fao-infoods-directory",
    name: "FAO/INFOODS Global Directory of Food Composition Tables and Databases",
    datasetVersion: "directory listing; individual dataset versions vary",
    licence: "Directory is a discovery resource; each listed dataset has separate terms",
    sourceType: "directory",
    qualityStatus: "not_applicable",
    useStatus: "excluded",
    attribution: "FAO/INFOODS Global Directory of Food Composition Tables and Databases.",
    termsUrl: "https://www.fao.org/food-composition/tables-and-databases/",
  },
];
