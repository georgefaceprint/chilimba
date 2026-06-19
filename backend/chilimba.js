/**
 * Calculates and maps the structural timeline and distribution mechanics 
 * for a rotating group savings circle.
 */
function generateChilimbaSchedule(groupMembers, targetItemPrice, frequency = 'MONTHLY') {
    const totalMembers = groupMembers.length;
    
    // Each member contributes an equal fractional share of the total target item price
    const individualContribution = Number((targetItemPrice / totalMembers).toFixed(2));
    
    // Cleanly shuffle members randomly to ensure fair, unbiased placement in the queue
    const randomizedRotation = [...groupMembers].sort(() => Math.random() - 0.5);
    
    const rotationSchedule = randomizedRotation.map((member, index) => {
        const roundNumber = index + 1;
        const currentDate = new Date();
        
        if (frequency === 'WEEKLY') {
            currentDate.setDate(currentDate.getDate() + (index * 7));
        } else {
            currentDate.setMonth(currentDate.getMonth() + index);
        }
        
        return {
            round: roundNumber,
            payout_user_id: member.user_id,
            payout_user_whatsapp: member.phone_number,
            payout_date: currentDate.toISOString().split('T')[0],
            contribution_per_member_zmw: individualContribution,
            total_pot_collected_zmw: Number((individualContribution * totalMembers).toFixed(2)),
            status: "SCHEDULED"
        };
    });
    
    return {
        total_rounds: totalMembers,
        per_round_contribution_zmw: individualContribution,
        full_schedule: rotationSchedule
    };
}

module.exports = {
  generateChilimbaSchedule
};
