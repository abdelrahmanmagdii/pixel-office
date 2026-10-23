import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BOSS_SEAT,
  assignRosterSeats,
  fillerDesks,
  overlapsSeat,
  pickChiefIndex,
  staffSeats,
} from '../src/data/seats.js';

test('default staff of 10 sit on rows 3, 7, 11 and leave the product-row fillers free', () => {
  const seats = staffSeats(10);
  assert.deepEqual(
    seats,
    [
      { col: 8, row: 3 },
      { col: 12, row: 3 },
      { col: 16, row: 3 },
      { col: 20, row: 3 },
      { col: 8, row: 7 },
      { col: 12, row: 7 },
      { col: 16, row: 7 },
      { col: 20, row: 7 },
      { col: 8, row: 11 },
      { col: 12, row: 11 },
    ],
  );
  for (const s of seats) assert.equal(overlapsSeat(s, BOSS_SEAT), false);
});

test('filler desks are the two open product seats plus the side props', () => {
  assert.deepEqual(fillerDesks(), [
    { col: 16, row: 11, key: 'desk-empty' },
    { col: 20, row: 11, key: 'desk-back' },
    { col: 4, row: 5, key: 'desk-empty' },
    { col: 24, row: 9, key: 'desk-laptop-back' },
  ]);
});

test('a larger team does not sit on the shifted boss desk', () => {
  const assigned = assignRosterSeats(Array.from({ length: 16 }, () => ({})));
  assert.equal(assigned[0].isChief, true);
  assert.deepEqual(assigned[0].desk, BOSS_SEAT);
  const staff = assigned.slice(1);
  assert.equal(staff.some((a) => a.isChief), false);
  for (const a of staff) assert.equal(overlapsSeat(a.desk, { col: 14, row: 18 }), false);
});

test('pickChiefIndex makes the first bot chief, and an explicit false is not a no-op', () => {
  assert.equal(pickChiefIndex([undefined, undefined]), 0);
  assert.equal(pickChiefIndex([false, undefined]), -1);
  assert.equal(pickChiefIndex([undefined, true]), 1);
  assert.equal(pickChiefIndex([true, true]), 0);
});

test('explicit clear desks are kept; a desk on the boss is reassigned', () => {
  const assigned = assignRosterSeats([
    { isChief: true },
    { desk: { col: 20, row: 3 } },
    { desk: { col: 14, row: 14 } },
  ]);
  assert.deepEqual(assigned[1].desk, { col: 20, row: 3 });
  assert.notDeepEqual(assigned[2].desk, { col: 14, row: 14 });
  assert.equal(overlapsSeat(assigned[2].desk, BOSS_SEAT), false);
});
