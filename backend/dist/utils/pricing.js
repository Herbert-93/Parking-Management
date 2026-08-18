"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateFinalCost = calculateFinalCost;
/**
 * Computes the final amount owed when a car exits.
 * If the car stayed within its paid duration, the customer just pays the
 * rate price. If they overstayed, we charge extra in whole-hour blocks
 * at a simple derived hourly rate (ratePrice / durationHours), so the
 * app never lets an overstaying car leave for free.
 */
function calculateFinalCost(params) {
    const { ratePrice, durationHours, entryTimeMs, exitTimeMs } = params;
    const actualMs = Math.max(exitTimeMs - entryTimeMs, 0);
    const actualHours = actualMs / (1000 * 60 * 60);
    const overageHoursRaw = actualHours - durationHours;
    const overageHours = overageHoursRaw > 0 ? Math.ceil(overageHoursRaw) : 0;
    const hourlyRate = durationHours > 0 ? ratePrice / durationHours : 0;
    const overageCost = overageHours * hourlyRate;
    const finalCost = Math.round((ratePrice + overageCost) * 100) / 100;
    return {
        actualHours: Math.round(actualHours * 100) / 100,
        overageHours,
        overageCost: Math.round(overageCost * 100) / 100,
        finalCost,
    };
}
