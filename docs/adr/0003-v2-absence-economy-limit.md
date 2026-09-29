# Limit absent-town production and consumption together

Status: accepted product boundary, September 29, 2026; not yet implemented.

Town production and consumption simulate for at most 48 hours of an absence, respecting storage and shortages, then both pause until return. Construction, already-started equipment crafts, and research may still finish across the full elapsed absence. During the simulated window, crafting/research require staff and utilities; preserve the running job's eligibility at the cutoff. Eligible running jobs can finish afterward; blocked jobs and jobs in stored buildings remain paused. New queued jobs can start/pay inputs within the window, then wait for return after its cutoff. The user accepted this separation so long upgrades can complete without unlimited unattended production or ongoing depletion of family and livestock supplies. Detailed event reconciliation and authoritative time handling remain implementation work; this does not authorize resetting the allowance separately on each device.

Opening the town while connected reconciles its saved progress and begins a fresh absence allowance on departure. Opening only battle or the parent dashboard does not reset the town window.
