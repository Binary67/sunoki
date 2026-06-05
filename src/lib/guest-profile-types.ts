export type GuestProfileStatus = "incoming" | "checked_in";
export type GuestProfileFilterStatus = GuestProfileStatus | "checked_out";

export const GUEST_ROOM_LEVELS = ["12", "13", "14"];
export const GUEST_BASE_STAY_DAYS = 27;
export const GUEST_ROOM_NUMBERS = [
  "01",
  "02",
  "03",
  "04",
  "05",
  "06",
  "07",
  "08",
  "09",
  "10",
  "11",
];

export const GUEST_PROFILE_COLUMNS = [
  "name",
  "room_number",
  "ic_no",
  "handphone_no",
  "email",
  "expected_delivery_date",
  "check_in_date",
  "hospital_of_delivery",
  "mode_of_delivery",
  "child_count",
  "special_note",
  "husband_name",
  "husband_ic_no",
  "husband_handphone_no",
  "husband_email",
  "address",
  "occupation",
  "occupation_2",
  "package_type",
  "package_payable_amount",
  "deposit_to_pay",
  "balance_to_pay",
  "package_entitlement_snapshot_json",
  "package_special_note",
  "consultant_name",
  "medical_food_notes",
  "kitchen_notes",
] as const;

export type GuestProfileColumn = (typeof GUEST_PROFILE_COLUMNS)[number];

export type GuestProfile = {
  id: number;
  name: string;
  status: GuestProfileStatus;
  roomNumber: string | null;
  icNo: string | null;
  handphoneNo: string | null;
  email: string | null;
  expectedDeliveryDate: string | null;
  checkInDate: string | null;
  hospitalOfDelivery: string | null;
  modeOfDelivery: string | null;
  childCount: string | null;
  specialNote: string | null;
  husbandName: string | null;
  husbandIcNo: string | null;
  husbandHandphoneNo: string | null;
  husbandEmail: string | null;
  address: string | null;
  occupation: string | null;
  occupation2: string | null;
  packageType: string | null;
  packagePayableAmount: string | null;
  depositToPay: string | null;
  balanceToPay: string | null;
  packageEntitlementSnapshotJson: string | null;
  packageSpecialNote: string | null;
  consultantName: string | null;
  medicalFoodNotes: string | null;
  kitchenNotes: string | null;
  userId: number | null;
  accountUsername: string | null;
  accountActive: number | null;
  createdAt: string;
};

export type GuestProfileListItem = Pick<
  GuestProfile,
  | "id"
  | "name"
  | "status"
  | "roomNumber"
  | "icNo"
  | "handphoneNo"
  | "expectedDeliveryDate"
  | "checkInDate"
  | "modeOfDelivery"
  | "packageType"
  | "accountUsername"
>;

export type GuestKitchenNote = {
  id: number;
  name: string;
  roomNumber: string | null;
  kitchenNotes: string;
};
