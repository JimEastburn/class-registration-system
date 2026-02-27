-- Fix classes.price to use dollars convention (30 = $30) instead of cents (3000)
-- The application convention is that all monetary values in the database are stored in dollars.
-- The code was incorrectly storing 3000 (cents) instead of 30 (dollars).
UPDATE classes SET price = 30 WHERE price = 3000;
