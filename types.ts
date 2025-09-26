export enum TShirtSize {
  S = 'S',
  M = 'M',
  L = 'L',
  XL = 'XL',
  XXL = 'XXL',
}

export enum DietaryPreference {
  VEGETARIAN = 'Vegetarian',
  NON_VEGETARIAN = 'Non-Vegetarian',
  VEGAN = 'Vegan',
  GLUTEN_FREE = 'Gluten-Free',
}

export interface RegistrationFormData {
  name: string;
  email: string;
  phone: string;
  branch_region: string;
  tshirt_size: TShirtSize;
  dietary_preference: DietaryPreference;
}

export interface Registration extends RegistrationFormData {
  id: string;
  registered_at: string;
  event_start_time: string;
}

export interface Session {
  name: string;
  speaker: string;
  description: string;
  durationMinutes: number;
}