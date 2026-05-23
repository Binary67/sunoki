import type {
  GuestProfile,
  GuestProfileColumn,
} from "@/src/lib/guest-profiles";

export type GuestProfileField = {
  label: string;
  multiline?: boolean;
  name: GuestProfileColumn;
  value: (profile: GuestProfile) => string | null;
};

export type GuestProfileSection = {
  title: string;
  fields: GuestProfileField[];
};

export const GUEST_PROFILE_SECTIONS: GuestProfileSection[] = [
  {
    title: "Mother",
    fields: [
      {
        label: "Name",
        name: "name",
        value: (profile) => profile.name,
      },
      {
        label: "IC No.",
        name: "ic_no",
        value: (profile) => profile.icNo,
      },
      {
        label: "Handphone No.",
        name: "handphone_no",
        value: (profile) => profile.handphoneNo,
      },
      {
        label: "Email address",
        name: "email",
        value: (profile) => profile.email,
      },
      {
        label: "Address",
        multiline: true,
        name: "address",
        value: (profile) => profile.address,
      },
      {
        label: "Occupation",
        name: "occupation",
        value: (profile) => profile.occupation,
      },
      {
        label: "Occupation 2",
        name: "occupation_2",
        value: (profile) => profile.occupation2,
      },
    ],
  },
  {
    title: "Delivery",
    fields: [
      {
        label: "EDD",
        name: "expected_delivery_date",
        value: (profile) => profile.expectedDeliveryDate,
      },
      {
        label: "Hospital of Delivery",
        name: "hospital_of_delivery",
        value: (profile) => profile.hospitalOfDelivery,
      },
      {
        label: "Mode of Delivery",
        name: "mode_of_delivery",
        value: (profile) => profile.modeOfDelivery,
      },
      {
        label: "No. of child",
        name: "child_count",
        value: (profile) => profile.childCount,
      },
      {
        label: "Special note",
        multiline: true,
        name: "special_note",
        value: (profile) => profile.specialNote,
      },
    ],
  },
  {
    title: "Husband",
    fields: [
      {
        label: "Husband's Name",
        name: "husband_name",
        value: (profile) => profile.husbandName,
      },
      {
        label: "Husband's IC No.",
        name: "husband_ic_no",
        value: (profile) => profile.husbandIcNo,
      },
      {
        label: "Husband's Handphone No.",
        name: "husband_handphone_no",
        value: (profile) => profile.husbandHandphoneNo,
      },
      {
        label: "Husband's Email",
        name: "husband_email",
        value: (profile) => profile.husbandEmail,
      },
    ],
  },
  {
    title: "Package",
    fields: [
      {
        label: "Type of Package",
        name: "package_type",
        value: (profile) => profile.packageType,
      },
      {
        label: "Payable amount for package (RM)",
        name: "package_payable_amount",
        value: (profile) => profile.packagePayableAmount,
      },
      {
        label: "Deposit to pay (RM)",
        name: "deposit_to_pay",
        value: (profile) => profile.depositToPay,
      },
      {
        label: "Balance to pay during check in (RM)",
        name: "balance_to_pay",
        value: (profile) => profile.balanceToPay,
      },
      {
        label: "Special Note (Free perks etc)",
        multiline: true,
        name: "package_special_note",
        value: (profile) => profile.packageSpecialNote,
      },
      {
        label: "Name of consultant",
        name: "consultant_name",
        value: (profile) => profile.consultantName,
      },
    ],
  },
  {
    title: "Notes",
    fields: [
      {
        label: "Medical Notes/Food Allergy/Food to avoid",
        multiline: true,
        name: "medical_food_notes",
        value: (profile) => profile.medicalFoodNotes,
      },
    ],
  },
];
