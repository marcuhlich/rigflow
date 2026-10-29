import { format } from 'date-fns';

/** Today's date in the user's local timezone (not UTC). */
export const todayLocalIso = () => format(new Date(), 'yyyy-MM-dd');
