import { CoachFacilitatorRepository } from "./repository";

export function coachFacilitatorService(
  coachFacilitatorRepository: CoachFacilitatorRepository
) {
  return {
    fetchCoachFacilitatorDetails:
      coachFacilitatorRepository.fetchCoachFacilitatorDetails,
    fetchMondayUserByEmail: coachFacilitatorRepository.fetchMondayUserByEmail,
    fetchMondayUserNameById:
      coachFacilitatorRepository.fetchMondayUserNameById,
  };
}
