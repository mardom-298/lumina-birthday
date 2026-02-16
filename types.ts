
export interface GuestEntry {
  id: string;
  name: string;
  phone: string;
  used: boolean;
  usedAt?: number;
}

export interface VenueOption {
  id: string;
  name: string;
  vibe: string;
  minSpend: string;
  closingTime: string;
  description: string;
  perks: string[];
  color: string;
  videoUrl?: string;
  googleMapsUrl?: string;
}

export interface TicketTier {
  id: string;
  name: string;
  description: string;
  stock: number;
  color: string;
  gradient: string;
  border: string;
  perks: string[];
}

export interface EventConfig {
  dateDisplay: string;
  fullDate: string;
  time: string;
  locationPlaceholder: string;
  adminUser?: string;
  adminPassword?: string;
  guestPasscode?: string;
  votingDeadline?: string;
  winningVenueId?: string | null;
  maxCapacity?: number;
}

export interface RsvpData {
  id?: string;
  firstName: string;
  lastName: string;
  email: string;
  selectedVenue: VenueOption | null;
  selectedTier?: TicketTier;
  guestCount: number;
  isAttending: boolean;
  songRequest: string;
  deviceFingerprint?: string;
  timestamp: number;
  ticketIds?: string[];
  phone?: string;
}

export enum AppState {
  LOCKED = 'LOCKED',
  INVITATION = 'INVITATION',
  RSVP = 'RSVP',
  SUCCESS = 'SUCCESS',
  ADMIN = 'ADMIN'
}

export interface GeneratedPersona {
  title: string;
  description: string;
  emoji: string;
}
