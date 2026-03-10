import { IFoodDonation } from "../models/FoodDonation";
import { IUser } from "../models/User";
import PickupTask, { TaskStatus } from "../models/PickupTask";

/**
 * User Story 5.1 & 5.7: Dynamic Food Risk & Predictive Safety
 * Calculates a risk score (0-100) based on food type, prep time, and environment.
 */
export const calculateRiskScore = (donation: IFoodDonation): { score: number; factors: string[]; isHighRisk: boolean } => {
    let score = 0;
    const factors: string[] = [];
    const now = new Date();
    const preparedTime = new Date(donation.preparedTime);
    const expiryTime = new Date(donation.expiryTime);

    // 1. Food Type Risk (Base)
    const perishableTypes = ['cooked', 'meat', 'dairy', 'seafood'];
    const semiPerishable = ['bakery', 'fruits', 'vegetables'];

    const foodType = donation.foodType.toLowerCase();

    if (perishableTypes.some(t => foodType.includes(t))) {
        score += 40;
        factors.push("Highly perishable food category");
    } else if (semiPerishable.some(t => foodType.includes(t))) {
        score += 20;
        factors.push("Semi-perishable food category");
    } else {
        score += 5;
        factors.push("Low-perishable food category");
    }

    // 2. Time factor (Age since preparation)
    const hoursSincePrep = (now.getTime() - preparedTime.getTime()) / (1000 * 60 * 60);
    if (hoursSincePrep > 4) {
        score += 30;
        factors.push("Prepared > 4 hours ago");
    } else if (hoursSincePrep > 2) {
        score += 15;
        factors.push("Prepared > 2 hours ago");
    }

    // 3. Proximity to Expiry
    const minutesToExpiry = (expiryTime.getTime() - now.getTime()) / (1000 * 60);
    if (minutesToExpiry < 0) {
        score = 100;
        factors.push("ALREADY EXPIRED");
    } else if (minutesToExpiry < 60) {
        score += 40;
        factors.push("Expiring in < 1 hour");
    } else if (minutesToExpiry < 120) {
        score += 20;
        factors.push("Expiring in < 2 hours");
    }

    // Cap at 100
    score = Math.min(score, 100);
    const isHighRisk = score >= 75;

    return { score, factors, isHighRisk };
};

/**
 * User Story 5.4: Volunteer Reliability Scoring
 * Updates the reliability score of a volunteer.
 * Target reliability = (Completed / (Total Assigned - Declined)) * 100
 * We subtract declined if they declined early, but let's just use a simpler metric:
 * Reliability = (Completed / Total Assigned) * 100
 */
export const updateVolunteerReliability = (user: IUser): number => {
    if (user.totalAssignedTasks === 0) return 100;
    const score = (user.completedTasks / user.totalAssignedTasks) * 100;
    return Math.round(score);
};

/**
 * User Story 5.6: Near-Expiry Emergency Mode
 * Checks if a donation should enter emergency mode (e.g., < 2 hours to expiry).
 */
export const checkEmergencyMode = (expiryTime: Date): boolean => {
    const now = new Date();
    const minutesToExpiry = (new Date(expiryTime).getTime() - now.getTime()) / (1000 * 60);
    return minutesToExpiry > 0 && minutesToExpiry < 120; // < 2 hours
};
