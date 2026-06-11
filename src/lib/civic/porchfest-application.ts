import {
  BAND_SIZES,
  FLINT_BASED,
  type CivicCategory,
  type CivicObjectFields,
} from "./civic-object-schema";

export const PORCHFEST_EVENT_SLUG = "porchfest-2026";

export const PORCHFEST_APPLICATION_CATEGORIES = [
  { value: "musician", label: "Musician" },
  { value: "vendor", label: "Vendor" },
  { value: "entertainer", label: "Entertainer" },
  { value: "other", label: "Other" },
] as const satisfies readonly {
  readonly value: CivicCategory;
  readonly label: string;
}[];

export type PorchfestApplicationCategory =
  (typeof PORCHFEST_APPLICATION_CATEGORIES)[number]["value"];
export type FlintConnection = (typeof FLINT_BASED)[number];
export type BandSize = (typeof BAND_SIZES)[number];

export interface PorchfestApplicationFormState {
  readonly category: PorchfestApplicationCategory;
  readonly name: string;
  readonly email: string;
  readonly phone: string;
  readonly city: string;
  readonly bio: string;
  readonly flintConnection: FlintConnection;
  readonly accessNeeds: string;
  readonly artistName: string;
  readonly bandSize: "" | BandSize;
  readonly genre: string;
  readonly setLength: string;
  readonly canDoThirty: boolean;
  readonly equipment: string;
  readonly ownPA: boolean;
  readonly musicLink: string;
  readonly musicLink2: string;
  readonly porchfestHistory: "" | "first" | "returning";
  readonly businessName: string;
  readonly foodDescription: string;
  readonly foodType: string;
  readonly vendorLink: string;
  readonly footprint: string;
  readonly vendorNeeds: string;
  readonly vendedBefore: "" | "yes" | "no";
  readonly actName: string;
  readonly actType: string;
  readonly actDescription: string;
  readonly orgName: string;
  readonly proposal: string;
  readonly workLink: string;
  readonly otherLinks: string;
  readonly history: string;
}

export interface EventApplicationSubmitInputLike {
  readonly eventSlug: string;
  readonly category: PorchfestApplicationCategory;
  readonly displayName: string;
  readonly contactName: string | null;
  readonly contactEmail: string;
  readonly contactPhone: string | null;
  readonly city: string | null;
  readonly bio: string | null;
  readonly flintBased: boolean;
  readonly accessNeeds: string | null;
  readonly categoryPayload: Record<string, unknown>;
  readonly sourceKey: string;
}

export const INITIAL_PORCHFEST_APPLICATION_STATE: PorchfestApplicationFormState =
  {
    category: "musician",
    name: "",
    email: "",
    phone: "",
    city: "",
    bio: "",
    flintConnection: "yes",
    accessNeeds: "",
    artistName: "",
    bandSize: "",
    genre: "",
    setLength: "",
    canDoThirty: false,
    equipment: "",
    ownPA: false,
    musicLink: "",
    musicLink2: "",
    porchfestHistory: "",
    businessName: "",
    foodDescription: "",
    foodType: "",
    vendorLink: "",
    footprint: "",
    vendorNeeds: "",
    vendedBefore: "",
    actName: "",
    actType: "",
    actDescription: "",
    orgName: "",
    proposal: "",
    workLink: "",
    otherLinks: "",
    history: "",
  };

export function cleanOptional(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function cleanSelect<T extends string>(value: "" | T): T | undefined {
  return value === "" ? undefined : value;
}

export function splitList(value: string): string[] {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function porchfestApplicationDisplayName(
  state: PorchfestApplicationFormState,
): string {
  if (state.category === "musician") {
    return cleanOptional(state.artistName) ?? state.name.trim();
  }
  if (state.category === "vendor") {
    return cleanOptional(state.businessName) ?? state.name.trim();
  }
  if (state.category === "entertainer") {
    return cleanOptional(state.actName) ?? state.name.trim();
  }
  return cleanOptional(state.orgName) ?? state.name.trim();
}

export function porchfestApplicationSourceKey(
  state: Pick<PorchfestApplicationFormState, "category" | "email">,
): string {
  return `public:${state.category}:${state.email.trim().toLowerCase()}`;
}

export function porchfestApplicationCategoryPayload(
  state: PorchfestApplicationFormState,
): Record<string, unknown> {
  const shared = {
    flintConnection: state.flintConnection,
  };

  if (state.category === "musician") {
    return {
      ...shared,
      artistName: state.artistName.trim(),
      bandSize: cleanOptional(state.bandSize),
      genre: state.genre.trim(),
      setLength: cleanOptional(state.setLength),
      canDoThirty: state.canDoThirty ? "yes" : "no",
      equipment: splitList(state.equipment),
      ownPA: state.ownPA ? "yes" : "no",
      musicLink: state.musicLink.trim(),
      musicLink2: cleanOptional(state.musicLink2),
      porchfestHistory: cleanOptional(state.porchfestHistory),
    };
  }

  if (state.category === "vendor") {
    return {
      ...shared,
      businessName: state.businessName.trim(),
      foodDescription: state.foodDescription.trim(),
      foodType: splitList(state.foodType),
      vendorLink: cleanOptional(state.vendorLink),
      footprint: cleanOptional(state.footprint),
      vendorNeeds: splitList(state.vendorNeeds),
      vendedBefore: cleanOptional(state.vendedBefore),
    };
  }

  if (state.category === "entertainer") {
    return {
      ...shared,
      actName: state.actName.trim(),
      actType: splitList(state.actType),
      actDescription: state.actDescription.trim(),
      workLink: cleanOptional(state.workLink),
    };
  }

  return {
    ...shared,
    orgName: state.orgName.trim(),
    proposal: state.proposal.trim(),
    otherLinks: cleanOptional(state.otherLinks) ?? cleanOptional(state.workLink),
    history: cleanOptional(state.history),
  };
}

export function porchfestApplicationToCivicObject(
  state: PorchfestApplicationFormState,
): CivicObjectFields {
  const shared = {
    category: state.category,
    name: state.name.trim(),
    email: state.email.trim().toLowerCase(),
    phone: cleanOptional(state.phone),
    city: cleanOptional(state.city),
    bio: cleanOptional(state.bio),
    flintBased: state.flintConnection,
    accessNeeds: cleanOptional(state.accessNeeds),
    sourceId: porchfestApplicationSourceKey(state),
    status: "submitted",
  } satisfies Partial<CivicObjectFields>;

  if (state.category === "musician") {
    return {
      ...shared,
      category: "musician",
      artistName: state.artistName.trim(),
      genre: state.genre.trim(),
      musicLink: state.musicLink.trim(),
      musicLink2: cleanOptional(state.musicLink2),
      bandSize: cleanSelect(state.bandSize),
      porchfestHistory: cleanSelect(state.porchfestHistory),
      canDoThirty: state.canDoThirty ? "yes" : "no",
      equipment: splitList(state.equipment),
      ownPA: state.ownPA ? "yes" : "no",
      setLength: cleanOptional(state.setLength),
    };
  }

  if (state.category === "vendor") {
    return {
      ...shared,
      category: "vendor",
      businessName: state.businessName.trim(),
      foodDescription: state.foodDescription.trim(),
      foodType: splitList(state.foodType),
      vendorLink: cleanOptional(state.vendorLink),
      footprint: cleanOptional(state.footprint),
      vendorNeeds: splitList(state.vendorNeeds),
      vendedBefore: cleanSelect(state.vendedBefore),
    };
  }

  if (state.category === "entertainer") {
    return {
      ...shared,
      category: "entertainer",
      actName: state.actName.trim(),
      actType: splitList(state.actType),
      actDescription: state.actDescription.trim(),
      workLink: cleanOptional(state.workLink),
    };
  }

  return {
    ...shared,
    category: "other",
    orgName: state.orgName.trim(),
    proposal: state.proposal.trim(),
    otherLinks: cleanOptional(state.otherLinks) ?? cleanOptional(state.workLink),
  };
}

export function porchfestApplicationSubmitInput(
  state: PorchfestApplicationFormState,
): EventApplicationSubmitInputLike {
  return {
    eventSlug: PORCHFEST_EVENT_SLUG,
    category: state.category,
    displayName: porchfestApplicationDisplayName(state),
    contactName: cleanOptional(state.name) ?? null,
    contactEmail: state.email.trim().toLowerCase(),
    contactPhone: cleanOptional(state.phone) ?? null,
    city: cleanOptional(state.city) ?? null,
    bio: cleanOptional(state.bio) ?? null,
    flintBased: state.flintConnection === "yes",
    accessNeeds: cleanOptional(state.accessNeeds) ?? null,
    categoryPayload: porchfestApplicationCategoryPayload(state),
    sourceKey: porchfestApplicationSourceKey(state),
  };
}
