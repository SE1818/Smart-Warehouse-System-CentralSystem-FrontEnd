export interface Profile {
  id: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  address?: string;
}

export const getFullName = (profile: Profile): string => {
  if (profile.firstName && profile.lastName) {
    return `${profile.firstName} ${profile.lastName}`;
  }
  if (profile.firstName) {
    return profile.firstName;
  }
  if (profile.lastName) {
    return profile.lastName;
  }
  return profile.username || profile.email;
};

export interface UpdateProfileRequest {
  username?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  address?: string;
}
