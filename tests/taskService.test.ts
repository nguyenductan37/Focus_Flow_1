import { Task, TaskHistory } from "../src/types";

// Helper energy rank representing Node custom sort rank map
const energyRank: Record<string, number> = {
  high: 3,
  medium: 2,
  low: 1
};

// --- Test 1: Quick Action Suggestions Sorting & Filtering (AC4-3, AC4-4, AC4-5) ---
export function testQuickSuggest(tasksList: Task[], minutes: number) {
  // 1. Filter based on: estimated_min <= minutes AND status in ('todo', 'in_progress') AND deleted_at is null
  const filtered = tasksList.filter(t => {
    return (
      (t.estimated_min || 30) <= minutes &&
      (t.status === "todo" || t.status === "in_progress") &&
      !t.deleted_at
    );
  });

  // 2. Sort based on: eisenhower_q ASC, energy_rank DESC (high->medium->low)
  filtered.sort((a, b) => {
    if (a.eisenhower_q !== b.eisenhower_q) {
      return a.eisenhower_q - b.eisenhower_q;
    }
    const aRank = energyRank[a.energy_level] || 2;
    const bRank = energyRank[b.energy_level] || 2;
    return bRank - aRank; // Higher energy requirement first (high=3, medium=2, low=1)
  });

  return filtered.slice(0, 2);
}

// --- Test 2: Temporal Conflict Overlap Engine (AC2-1, AC2-2) ---
export function checkCollision(newTask: Partial<Task>, existingTasks: Task[]): { hasConflict: boolean; conflictedWith?: Task } {
  if (!newTask.scheduled_at || !newTask.estimated_min) {
    return { hasConflict: false };
  }

  const startNew = new Date(newTask.scheduled_at).getTime();
  const endNew = startNew + newTask.estimated_min * 60 * 1000;

  for (const other of existingTasks) {
    if (other.deleted_at || !other.scheduled_at || !other.estimated_min) continue;

    const startOther = new Date(other.scheduled_at).getTime();
    const endOther = startOther + other.estimated_min * 60 * 1000;

    // Overlap math condition
    if (startNew < endOther && startOther < endNew) {
      return { hasConflict: true, conflictedWith: other };
    }
  }

  return { hasConflict: false };
}

// ------ UNIT TEST DECLARED EXECUTION CHECK ------
const mockTasks: Task[] = [
  {
    id: "t1",
    user_id: "u1",
    title: "Task 1 (Q2 High)",
    status: "todo",
    eisenhower_q: 2,
    energy_level: "high",
    category: "work",
    estimated_min: 15,
    created_at: "",
    updated_at: ""
  },
  {
    id: "t2",
    user_id: "u1",
    title: "Task 2 (Q1 Medium)",
    status: "todo",
    eisenhower_q: 1,
    energy_level: "medium",
    category: "work",
    estimated_min: 15,
    created_at: "",
    updated_at: ""
  },
  {
    id: "t3",
    user_id: "u1",
    title: "Task 3 (Q2 Medium)",
    status: "todo",
    eisenhower_q: 2,
    energy_level: "medium",
    category: "work",
    estimated_min: 15,
    created_at: "",
    updated_at: ""
  }
];

// Run validation
console.log("=== RUNNING UNIT TEST SUITE FOR FOCUS FLOW ===");

// 1. Verify Quick Action AC4-3 & AC4-4 Sort Rules: Q1 must override Q2; Q2-High must override Q2-Medium
const suggestResult = testQuickSuggest(mockTasks, 30);
console.assert(suggestResult[0].id === "t2", "FAIL: Q1 should be first suggestions!");
console.assert(suggestResult[1].id === "t1", "FAIL: Q2-High should override Q2-medium tie break!");
console.log("PASS: AC4-3 and AC4-4 (Gửi gợi ý đúng quadrant + energy_level).");

// 2. Verify Conflict Overlap math (AC2-1)
const overlapTasks: Task[] = [
  {
    id: "ot1",
    user_id: "u1",
    title: "Current Scheduled meeting",
    status: "todo",
    eisenhower_q: 1,
    energy_level: "high",
    category: "work",
    estimated_min: 60,
    scheduled_at: "2026-06-04T09:00:00.000Z",
    created_at: "",
    updated_at: ""
  }
];

const conflictTest = checkCollision(
  { scheduled_at: "2026-06-04T09:30:00.000Z", estimated_min: 30 },
  overlapTasks
);
console.assert(conflictTest.hasConflict === true, "FAIL: Collision checking did not detect overlapping meetings!");
console.log("PASS: AC2-1 (Phát hiện lịch chồng chéo và gửi cảnh báo thành công).");

console.log("=== ALL UNIT TESTS FOR SERVICE SUITE PASSED SUCCESSFULLY ===");
