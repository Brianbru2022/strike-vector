import { expect, test } from '@playwright/test';
import { RELEASE_INFO } from '../../src/game/Release';

const completedCampaign = {
  version: 3,
  unlockedMission: 9,
  completedMissionIds: ['m1_coastal_strike', 'm2_valley_run', 'm3_convoy_hunter', 'm4_night_raid', 'm5_pilot_rescue', 'm6_fleet_defence', 'm7_bridge_strike', 'm8_airbase_raid', 'm9_forward_defence', 'm10_hq_assault'],
  bestScores: {}, campaignFlags: [], difficulty: 'PILOT', renderQuality: 'HIGH', controlScale: 1, controlOpacity: 0.82, leftHanded: false,
};

test('offers guided Mission 1 as the primary first-run action', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'IRON KESTREL' })).toBeVisible();
  await expect(page.getByText('1.2 BETA 2')).toBeVisible();
  await expect(page.getByText('DEVELOPMENT BUILD')).toBeVisible();
  await expect(page.getByRole('button', { name: 'START GUIDED CAMPAIGN' })).toBeFocused();
  await page.getByRole('button', { name: 'START GUIDED CAMPAIGN' }).click();
  await expect(page.getByRole('heading', { name: 'OPERATION DECK TEST' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'GUIDED', exact: true })).toHaveClass(/bg-emerald-300/);
});

test('keeps the flight HUD contextual while preserving essential status', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'START GUIDED CAMPAIGN' }).click();
  await page.getByRole('button', { name: 'SCRAMBLE LAUNCH' }).click();
  const hud = page.locator('#game-hud');
  await expect(hud).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('MAP PROGRESS:')).toBeHidden();
  await page.keyboard.press('KeyI');
  await expect(hud).toHaveAttribute('data-hud-mode', 'EXPANDED');
  await expect(page.getByText('MAP PROGRESS:')).toBeVisible();
  await page.keyboard.press('KeyI');
  await expect(page.getByText('MAP PROGRESS:')).toBeHidden();

  const essentialStatus = page.getByLabel('Essential aircraft and weapon status');
  if (testInfo.project.name === 'mobile-landscape') {
    await expect(essentialStatus).toBeVisible();
    await expect(essentialStatus).toContainText('AIRFRAME');
    await expect(essentialStatus).toContainText('FUEL');
    await expect(essentialStatus).toContainText('AIM-9L');
  } else {
    await expect(page.getByRole('button', { name: /HUD DETAIL/ })).toBeVisible();
    await expect(essentialStatus).toBeHidden();
  }
});

test('opens the isolated three-sortie North Atlantic showcase', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'NORTH ATLANTIC SHOWCASE' }).click();
  await expect(page.getByRole('heading', { name: 'NORTH ATLANTIC SHOWCASE' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'LAUNCH SORTIE' })).toHaveCount(3);
  await expect(page.getByText('0/3 SIGNATURE SORTIES COMPLETE')).toBeVisible();
  await page.getByRole('button', { name: 'LAUNCH SORTIE' }).first().click();
  await expect(page.getByRole('heading', { name: 'OPERATION DECK TEST' })).toBeVisible();
  await page.getByRole('button', { name: 'SCRAMBLE LAUNCH' }).click();
  await expect(page.getByText(/FLIGHT SCHOOL [1-9]\/9/)).toBeVisible({ timeout: 15_000 });
});

test('launches showcase Fleet Defence with its declared Fleet CAP fit', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'NORTH ATLANTIC SHOWCASE' }).click();
  await page.getByRole('button', { name: 'LAUNCH SORTIE' }).nth(1).click();
  await page.getByRole('button', { name: 'SCRAMBLE LAUNCH' }).click();
  await expect(page.getByText(/HMS INVINCIBLE \d+%/)).toBeVisible();
  const snapshot = await page.evaluate(() => (window as unknown as { __STRIKE_VECTOR_VISUAL_AUDIT__: { inputSnapshot: () => Record<string, unknown> } }).__STRIKE_VECTOR_VISUAL_AUDIT__.inputSnapshot());
  expect(snapshot).toMatchObject({ missiles: 6, bombs: 0, rockets: 4, flares: 6, trainingEnabled: false });
});

test('opens isolated internal validation scenarios in a development build', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'VALIDATION RUNS' }).click();
  await expect(page.getByRole('heading', { name: 'VALIDATION RUNS' })).toBeVisible();
  await page.getByRole('button', { name: 'SHOW FULL MATRIX' }).click();
  await expect(page.getByRole('button', { name: 'START CLEAN RUN' })).toHaveCount(21);
  await expect(page.getByText('0/21').first()).toBeVisible();
  await expect(page.getByText('0/6').first()).toBeVisible();
  // Return to the compact priority view before launching. Keeping all 21 cards
  // mounted creates a very tall nested scroll area and made Playwright's
  // stability check race the container's automatic scroll positioning.
  await page.getByRole('button', { name: 'SHOW PRIORITY RUNS' }).click();
  await expect(page.getByRole('button', { name: 'START CLEAN RUN' })).toHaveCount(3);
  await page.getByRole('button', { name: 'START CLEAN RUN' }).first().click();
  await expect(page.getByRole('heading', { name: 'OPERATION DECK TEST' })).toBeVisible();
  await page.getByRole('button', { name: 'SCRAMBLE LAUNCH' }).click();
  await expect(page.getByText(/FLIGHT SCHOOL [1-9]\/9/)).toBeVisible();
  expect(await page.evaluate(() => ({
    campaignV4: localStorage.getItem('STRIKE_VECTOR_HARRIER_87_CAMPAIGN_V4'),
    campaign: localStorage.getItem('STRIKE_VECTOR_HARRIER_87_CAMPAIGN_V3'),
    showcase: localStorage.getItem('STRIKE_VECTOR_HARRIER_87_SHOWCASE_V1'),
    operations: localStorage.getItem('STRIKE_VECTOR_OPERATIONS_ACTIVE_V1'),
    diagnostics: localStorage.getItem('STRIKE_VECTOR_DIAGNOSTICS_V3'),
    highScore: localStorage.getItem('strike_vector_best_score'),
  }))).toEqual({ campaignV4: null, campaign: null, showcase: null, operations: null, diagnostics: null, highScore: null });

  await page.evaluate(() => (window as unknown as { __STRIKE_VECTOR_VALIDATION__: { completeCurrent: (victory: boolean) => void } }).__STRIKE_VECTOR_VALIDATION__.completeCurrent(true));
  await expect(page.getByText('RUN 1 AFTER-ACTION REVIEW')).toBeVisible();
  await page.getByRole('button', { name: 'SAVE EVIDENCE' }).click();
  await expect(page.getByText('1/21').first()).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('STRIKE_VECTOR_PLAYTEST_EVIDENCE_V1') || '[]')[0]?.scenarioId)).toBe('V01');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'EXPORT JSON' }).click();
  await expect((await downloadPromise).suggestedFilename()).toContain(RELEASE_INFO.buildId);
});

test('opens isolated internal validation for the five-person early control concept test', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'EARLY CONTROL TEST' }).click();
  await expect(page.getByRole('heading', { name: 'EARLY CONTROL-CONCEPT TEST' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'START CLEAN GUIDED RUN' })).toHaveCount(5);
  await expect(page.getByText('0/5').first()).toBeVisible();
  await page.getByRole('button', { name: 'START CLEAN GUIDED RUN' }).first().click();
  await expect(page.getByRole('heading', { name: 'OPERATION DECK TEST' })).toBeVisible();
  await page.getByRole('button', { name: 'SCRAMBLE LAUNCH' }).click();
  await page.evaluate(() => (window as unknown as { __STRIKE_VECTOR_VALIDATION__: { completeCurrent: (victory: boolean) => void } }).__STRIKE_VECTOR_VALIDATION__.completeCurrent(true));
  await expect(page.getByText('P01 // OBSERVER REVIEW')).toBeVisible();
  for (const select of await page.getByRole('combobox').all()) await select.selectOption('INDEPENDENT');
  for (const input of await page.getByRole('spinbutton').all()) await input.fill('30');
  await page.getByText('After the run, did the player say they wanted another sortie?').locator('..').getByRole('button', { name: 'YES' }).click();
  await page.getByText('Did they request another sortie before the observer suggested Mission 2?').locator('..').getByRole('button', { name: 'YES' }).click();
  await page.getByRole('button', { name: 'SAVE HUMAN EVIDENCE' }).click();
  await expect(page.getByText('1/5').first()).toBeVisible();
  expect(await page.evaluate(() => ({
    control: JSON.parse(localStorage.getItem('IRON_KESTREL_CONTROL_CONCEPT_PLAYTEST_V1') || '[]')[0]?.slotId,
    campaign: localStorage.getItem('STRIKE_VECTOR_HARRIER_87_CAMPAIGN_V4'),
    validation: localStorage.getItem('STRIKE_VECTOR_PLAYTEST_EVIDENCE_V1'),
  }))).toEqual({ control: 'P01', campaign: null, validation: null });
});

test('runs the isolated Stage 2 campaign balance matrix', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'VALIDATION RUNS' }).click();
  await page.getByRole('button', { name: 'STAGE 2 CAMPAIGN MATRIX' }).click();
  await expect(page.getByRole('heading', { name: 'CAMPAIGN BALANCE VALIDATION' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'START CLEAN RUN' })).toHaveCount(26);
  await expect(page.getByText('0/26').first()).toBeVisible();
  await expect(page.getByText('0/16').first()).toBeVisible();
  await page.getByRole('button', { name: 'START CLEAN RUN' }).first().click();
  await expect(page.getByRole('heading', { name: 'OPERATION DECK TEST' })).toBeVisible();
  await page.getByRole('button', { name: 'SCRAMBLE LAUNCH' }).click();
  await page.evaluate(() => (window as unknown as { __STRIKE_VECTOR_VALIDATION__: { completeCurrent: (victory: boolean) => void } }).__STRIKE_VECTOR_VALIDATION__.completeCurrent(true));
  await expect(page.getByText('RUN 1 AFTER-ACTION REVIEW')).toBeVisible();
  await page.getByRole('button', { name: 'SAVE EVIDENCE' }).click();
  await expect(page.getByRole('heading', { name: 'CAMPAIGN BALANCE VALIDATION' })).toBeVisible();
  await expect(page.getByText('1/26').first()).toBeVisible();
  expect(await page.evaluate(() => ({
    stage1: localStorage.getItem('STRIKE_VECTOR_PLAYTEST_EVIDENCE_V1'),
    stage2: JSON.parse(localStorage.getItem('IRON_KESTREL_CAMPAIGN_VALIDATION_V1') || '[]')[0]?.scenarioId,
    campaign: localStorage.getItem('STRIKE_VECTOR_HARRIER_87_CAMPAIGN_V4'),
  }))).toEqual({ stage1: null, stage2: 'CV-P01', campaign: null });
});

test('builds, validates, exports and launches an external mission document', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'MISSION AUTHORING' }).click();
  await expect(page.getByRole('heading', { name: 'MISSION AUTHORING TOOLKIT' })).toBeVisible();
  await page.getByRole('button', { name: 'NEW TEST MISSION' }).click();
  await expect(page.getByText('READY TO COMPILE')).toBeVisible();
  await expect(page.getByText('WORLD PREVIEW // CONTACTS, ANCHORS & PATHS')).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'EXPORT BUNDLE DATA' }).click();
  await expect((await download).suggestedFilename()).toBe('authoring_test_mission.mission.json');
  await page.getByRole('button', { name: 'LAUNCH TEST SORTIE' }).click();
  await expect(page.getByRole('heading', { name: 'OPERATION DRAFT LANCE' })).toBeVisible();
  await page.getByRole('button', { name: /ABORT BRIEFING/ }).click();
  await expect(page.getByRole('heading', { name: 'MISSION AUTHORING TOOLKIT' })).toBeVisible();
});

test('launches guided carrier qualification with device-aware training prompts', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'START GUIDED CAMPAIGN' }).click();
  await page.getByRole('button', { name: 'GUIDED', exact: true }).click();
  await page.getByRole('button', { name: 'SCRAMBLE LAUNCH' }).click();

  await expect(page.getByText(/FLIGHT SCHOOL [1-9]\/9/)).toBeVisible();
  await expect(page.getByRole('status')).toHaveAttribute('data-hud-region', 'training-banner');
  await expect(page.getByRole('status')).toHaveAttribute('data-training-phase', 'INSTRUCTION');
  await expect(page.getByRole('button', { name: 'SKIP TRAINING' })).toBeVisible();
  if (testInfo.project.name !== 'desktop') {
    await expect(page.getByRole('status')).toContainText('PITCH CONTROL', { timeout: 15_000 });
    await expect(page.getByRole('status')).toContainText('PITCH UP');
    await expect(page.getByRole('status')).not.toContainText('W/UP');
  } else {
    await expect(page.getByRole('status')).toContainText('W/UP', { timeout: 15_000 });
  }
  await page.getByRole('button', { name: 'SKIP TRAINING' }).click();
  if (testInfo.project.name === 'desktop') {
    await expect(page.getByRole('button', { name: 'CONTROLS [H]' })).toHaveAttribute('aria-expanded', 'false');
    await page.getByRole('button', { name: 'CONTROLS [H]' }).click();
    const controls = page.getByLabel('Flight control reference');
    await expect(controls).toBeVisible();
    await expect(controls).toContainText('FLY LEFT / RIGHT');
    await expect(controls).not.toContainText('TURN / SPEED');
  } else {
    await expect(page.getByRole('button', { name: 'Fire twin 30mm ADEN cannon' })).toBeVisible();
  }
});

test('shows first-frame controller flight prompts for an already connected Xbox-compatible pad', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Connected-controller boot detection is exercised in the desktop project.');
  await page.addInitScript(() => {
    const buttons = Array.from({ length: 16 }, () => ({ pressed: false, touched: false, value: 0 }));
    const gamepad = { axes: [0, 0], buttons, connected: true, mapping: 'standard', id: 'Xbox Compatible Controller', index: 0, timestamp: 1, vibrationActuator: null };
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [gamepad] });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'START GUIDED CAMPAIGN' }).click();
  await page.getByRole('button', { name: 'SCRAMBLE LAUNCH' }).click();
  const trainingPrompt = page.getByRole('status').filter({ hasText: 'FLIGHT SCHOOL' });
  await expect(trainingPrompt).toContainText('PITCH CONTROL', { timeout: 15_000 });
  await expect(trainingPrompt).toContainText('LEFT STICK / D-PAD ↑');
  await expect(trainingPrompt).not.toContainText('W/UP');
});

test('keeps the prioritised HUD notification readable at supported viewports', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'The viewport matrix is exercised once with the desktop browser engine.');
  await page.goto('/');
  await page.getByRole('button', { name: 'START GUIDED CAMPAIGN' }).click();
  await page.getByRole('button', { name: 'SCRAMBLE LAUNCH' }).click();

  for (const viewport of [
    { width: 1280, height: 720, minimumFontSize: 9 },
    { width: 1920, height: 1080, minimumFontSize: 10 },
    { width: 2560, height: 1440, minimumFontSize: 11 },
    { width: 3440, height: 1440, minimumFontSize: 12 },
    { width: 844, height: 390, minimumFontSize: 10 },
  ]) {
    await page.setViewportSize(viewport);
    const notification = page.getByRole('status');
    await expect(notification).toBeVisible();
    const bounds = await notification.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(viewport.width);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(viewport.height);
    const smallestText = await notification.locator('div').evaluateAll((elements) => Math.min(...elements.map((element) => Number.parseFloat(getComputedStyle(element).fontSize))));
    expect(smallestText).toBeGreaterThanOrEqual(viewport.minimumFontSize);
  }
});

test('exposes remapping, accessibility and local diagnostics in settings', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'SYSTEM SETTINGS' }).click();

  await expect(page.getByText('CONTROL BINDINGS')).toBeVisible();
  await expect(page.getByText('KEYBOARD', { exact: true })).toBeVisible();
  await expect(page.getByText('GAMEPAD', { exact: true })).toBeVisible();
  await expect(page.getByText('ACCESSIBILITY & EFFECTS')).toBeVisible();
  await expect(page.getByLabel('HUD scale')).toHaveValue('AUTO');
  await expect(page.getByLabel('Touch safe area')).toHaveValue('12');
  await expect(page.getByLabel('Touch vertical lift')).toHaveValue('0');
  await expect(page.getByText('TERRAIN-CLEAR TOUCH PANELS')).toBeVisible();
  await expect(page.getByText('HUD CONTRAST')).toBeVisible();
  await expect(page.getByText('TEXT CONTRAST')).toBeVisible();
  await expect(page.getByText('LOCAL PLAYTEST DIAGNOSTICS')).toBeVisible();
  await expect(page.getByText('0 sorties · 0% wins')).toHaveCount(3);
  await expect(page.getByText('RELEASE BALANCE MATRIX')).toBeVisible();
  await expect(page.getByText(`Campaign 0/${RELEASE_INFO.campaignMissionCount}`)).toHaveCount(3);
  await expect(page.getByText('Deployments 0/2')).toHaveCount(3);
  await expect(page.getByText('Archetypes 0/6')).toHaveCount(3);
  await expect(page.getByLabel('Current-build Stage 7 balance measurements')).toBeVisible();
  await expect(page.getByText('ORDNANCE USED')).toBeVisible();
  await expect(page.getByText('THREAT & RECOVERY')).toBeVisible();
  await expect(page.getByRole('button', { name: 'EXPORT STAGE 7 EVIDENCE' })).toBeVisible();
  await expect(page.getByLabel('RENDER QUALITY')).toHaveValue('AUTO');
  await expect(page.getByText('PERFORMANCE & OFFLINE INSTALLATION')).toBeVisible();
  await expect(page.getByText('ACTIVE QUALITY')).toBeVisible();
  await expect(page.getByRole('button', { name: 'REPAIR OFFLINE FILES' })).toBeVisible();
  const issueReportDownload = page.waitForEvent('download');
  await page.getByRole('button', { name: 'EXPORT ISSUE REPORT' }).click();
  await expect((await issueReportDownload).suggestedFilename()).toContain('iron-kestrel-issue-report');
});

test('keeps simultaneous mobile touch actions independent and inside safe areas', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-landscape', 'Touch certification runs in the compact mobile project.');
  await page.goto('/');
  await page.getByRole('button', { name: 'START GUIDED CAMPAIGN' }).click();
  await page.getByRole('button', { name: 'SCRAMBLE LAUNCH' }).click();

  const controls = page.getByLabel('Right-handed touch flight controls');
  await expect(controls).toBeVisible();
  await expect(page.getByRole('button', { name: 'Turn / Fly Left' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Turn / Fly Right' })).toBeVisible();
  const actions = [
    ['Climb / Pitch Up', 11],
    ['Turn / Fly Right', 12],
    ['Fire twin 30mm ADEN cannon', 13],
    ['VTOL Hover Mode', 14],
    ['Deploy countermeasure flares', 15],
    ['Cycle secondary weapon', 16],
  ] as const;
  for (const [name, pointerId] of actions) await page.getByRole('button', { name }).dispatchEvent('pointerdown', { pointerId, pointerType: 'touch', isPrimary: pointerId === 11 });
  await page.waitForTimeout(100);
  const active = await page.evaluate(() => (window as unknown as { __STRIKE_VECTOR_VISUAL_AUDIT__: { inputSnapshot: () => Record<string, unknown> } }).__STRIKE_VECTOR_VISUAL_AUDIT__.inputSnapshot());
  expect(active).toMatchObject({ up: true, right: true, vtol: true, fireCannon: true, selectedWeapon: 'BOMB' });
  expect(Number(active.flares)).toBeLessThan(6);

  for (const [name, pointerId] of actions) await page.getByRole('button', { name }).dispatchEvent('pointercancel', { pointerId, pointerType: 'touch' });
  const released = await page.evaluate(() => (window as unknown as { __STRIKE_VECTOR_VISUAL_AUDIT__: { inputSnapshot: () => Record<string, unknown> } }).__STRIKE_VECTOR_VISUAL_AUDIT__.inputSnapshot());
  expect(released).toMatchObject({ up: false, right: false, vtol: false, fireCannon: false });
  const bounds = await controls.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(844);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(390);
});

test('releases held Xbox-compatible actions when the controller disconnects', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'The mocked standard controller is exercised once.');
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => (window as unknown as { __testGamepads?: unknown[] }).__testGamepads ?? [] });
  });
  await page.goto('/');
  await page.getByRole('button', { name: 'START GUIDED CAMPAIGN' }).click();
  await page.getByRole('button', { name: 'SCRAMBLE LAUNCH' }).click();
  await page.evaluate(() => {
    const buttons = Array.from({ length: 16 }, (_, index) => ({ pressed: [0, 4].includes(index), touched: [0, 4].includes(index), value: [0, 4].includes(index) ? 1 : 0 }));
    (window as unknown as { __testGamepads: unknown[] }).__testGamepads = [{ axes: [-0.9, -0.9], buttons, connected: true, mapping: 'standard', id: 'Xbox Compatible Controller', index: 0, timestamp: performance.now(), vibrationActuator: null }];
  });
  await page.waitForTimeout(100);
  const active = await page.evaluate(() => (window as unknown as { __STRIKE_VECTOR_VISUAL_AUDIT__: { inputSnapshot: () => Record<string, unknown> } }).__STRIKE_VECTOR_VISUAL_AUDIT__.inputSnapshot());
  expect(active).toMatchObject({ up: true, left: true, vtol: true, fireCannon: true });
  await page.evaluate(() => { (window as unknown as { __testGamepads: unknown[] }).__testGamepads = []; });
  await page.waitForTimeout(100);
  await expect(page.getByText('▣ CONTROLLER DISCONNECTED — KEYBOARD OR TOUCH CONTROL RESTORED')).toBeVisible();
  const released = await page.evaluate(() => (window as unknown as { __STRIKE_VECTOR_VISUAL_AUDIT__: { inputSnapshot: () => Record<string, unknown> } }).__STRIKE_VECTOR_VISUAL_AUDIT__.inputSnapshot());
  expect(released).toMatchObject({ up: false, left: false, vtol: false, fireCannon: false });
});

test('configures damaged recovery practice independently of campaign progress', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'LANDING PRACTICE' }).click();
  await page.getByLabel('Landing difficulty').selectOption('VETERAN');
  await page.getByRole('button', { name: /AIRCRAFT CONDITION/ }).click();
  await expect(page.getByText('DAMAGED 58%')).toBeVisible();
  await page.getByRole('button', { name: /ROLLING CARRIER RECOVERY/ }).click();
  await expect(page.getByRole('status')).toContainText('INVINCIBLE APPROACH');
  const snapshot = await page.evaluate(() => (window as unknown as { __STRIKE_VECTOR_VISUAL_AUDIT__: { inputSnapshot: () => Record<string, unknown> } }).__STRIKE_VECTOR_VISUAL_AUDIT__.inputSnapshot());
  expect(snapshot.health).toBe(58);
});

test('retains essential launch, impact and objective cues with reduced effects', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'SYSTEM SETTINGS' }).click();
  await page.getByRole('button', { name: /REDUCED MOTION \/ EFFECTS/ }).click();
  await page.getByRole('button', { name: 'CONFIRM & CLOSE' }).click();
  await page.getByRole('button', { name: 'START GUIDED CAMPAIGN' }).click();
  await page.getByRole('button', { name: 'SCRAMBLE LAUNCH' }).click();
  await expect(page.locator('.reduced-effects-mode')).toBeVisible();
  await expect(page.getByRole('status')).toContainText('FLIGHT SCHOOL');
  await page.evaluate(() => (window as unknown as { __STRIKE_VECTOR_VISUAL_AUDIT__: { showCombatEffects: (mode: string) => void } }).__STRIKE_VECTOR_VISUAL_AUDIT__.showCombatEffects('LAUNCH'));
  let effects = await page.evaluate(() => (window as unknown as { __STRIKE_VECTOR_VISUAL_AUDIT__: { effectsSnapshot: () => { projectiles: string[]; particles: number } } }).__STRIKE_VECTOR_VISUAL_AUDIT__.effectsSnapshot());
  expect(effects.projectiles).toEqual(expect.arrayContaining(['MISSILE', 'ROCKET']));
  await page.evaluate(() => (window as unknown as { __STRIKE_VECTOR_VISUAL_AUDIT__: { showCombatEffects: (mode: string) => void } }).__STRIKE_VECTOR_VISUAL_AUDIT__.showCombatEffects('IMPACT'));
  effects = await page.evaluate(() => (window as unknown as { __STRIKE_VECTOR_VISUAL_AUDIT__: { effectsSnapshot: () => { projectiles: string[]; particles: number } } }).__STRIKE_VECTOR_VISUAL_AUDIT__.effectsSnapshot());
  expect(effects.particles).toBeGreaterThan(0);
});

test('provides the corrected flight manual, accessibility guide and release credits', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'FLIGHT MANUAL / INTEL' }).click();
  await expect(page.getByText('ACCESSIBILITY GUIDE')).toBeVisible();
  await expect(page.getByText('CREDITS & RELEASE')).toBeVisible();
  await expect(page.getByText(RELEASE_INFO.buildId)).toBeVisible();
  await expect(page.getByText(/FIRE SELECTED SECONDARY/).first()).toBeVisible();
  await expect(page.getByText(/Smart Combat Camera/)).toBeVisible();
  await expect(page.getByText('Choose the direction you want to fly.')).toBeVisible();
  await expect(page.getByText(/turns at low speed, then accelerates in the new direction/)).toBeVisible();
  await expect(page.getByText(/KEYBOARD: A \/ D or LEFT \/ RIGHT arrows/)).toBeVisible();
  await expect(page.getByText(/GAMEPAD: LEFT STICK or D-PAD left \/ right/)).toBeVisible();
  await expect(page.getByText(/TOUCH: On-screen LEFT \/ RIGHT flight arrows/)).toBeVisible();
});

test('offers presentation-only smart combat framing', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'SYSTEM SETTINGS' }).click();
  await expect(page.getByRole('combobox', { name: 'Combat camera' })).toHaveValue('OFF');
  await page.getByRole('combobox', { name: 'Combat camera' }).selectOption('SMART');
  await page.getByRole('button', { name: 'CONFIRM & CLOSE' }).click();
  const setting = await page.evaluate(() => JSON.parse(localStorage.getItem('STRIKE_VECTOR_HARRIER_87_CAMPAIGN_V4') || 'null')?.accessibility?.combatZoom);
  expect(setting).toBe('SMART');
});

test('preserves local saves when the page is interrupted', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('STRIKE_VECTOR_HARRIER_87_CAMPAIGN_V4') || 'null'));
  expect(stored).toMatchObject({ version: 4, renderQuality: 'AUTO', difficulty: 'PILOT' });
});

test('telegraphs a fighter engagement and preserves pause during combat', async ({ page }) => {
  await page.addInitScript((save) => localStorage.setItem('STRIKE_VECTOR_HARRIER_87_CAMPAIGN_V3', JSON.stringify(save)), completedCampaign);
  await page.goto('/');
  await page.getByRole('button', { name: 'CAMPAIGN', exact: true }).click();
  await page.getByRole('button', { name: 'Open strategic map' }).first().click();
  await page.getByRole('button', { name: 'Open Mission 1: Carrier Qualification', exact: true }).click();
  await page.getByRole('button', { name: 'STANDARD', exact: true }).click();
  await page.getByRole('button', { name: 'SCRAMBLE LAUNCH' }).click();
  await expect(page.getByText(/BANDIT (DETECTED|TRACKING|FIRING)/).first()).toBeVisible({ timeout: 8_000 });
  await page.getByRole('button', { name: /PAUSE/ }).click();
  await expect(page.getByText('OPERATION PAUSED')).toBeVisible();
  await page.getByRole('button', { name: 'RESUME SORTIE' }).click();
  await expect(page.getByText('OPERATION PAUSED')).toBeHidden();
  await expect(page.getByRole('button', { name: /PAUSE/ })).toBeVisible();
});

test('selects, persists and launches a seeded three-sortie operation', async ({ page }) => {
  await page.addInitScript((save) => localStorage.setItem('STRIKE_VECTOR_HARRIER_87_CAMPAIGN_V3', JSON.stringify(save)), completedCampaign);
  await page.goto('/');
  await page.getByRole('button', { name: 'DYNAMIC OPERATIONS', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'DYNAMIC OPERATIONS' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'REVIEW CONTRACT' })).toHaveCount(3);
  await page.getByRole('button', { name: 'REVIEW CONTRACT' }).first().click();
  await expect(page.getByText('SORTIE SEQUENCE')).toBeVisible();
  await expect(page.getByText('SORTIE 1 OF 3 READY')).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: 'DYNAMIC OPERATIONS', exact: true }).click();
  await expect(page.getByText('ACTIVE DEPLOYMENT')).toBeVisible();
  await page.getByRole('button', { name: 'RESUME DOSSIER' }).click();
  await page.getByRole('button', { name: 'OPEN BRIEFING' }).click();
  await expect(page.getByText(/Deployment stage 1 of 3/)).toBeVisible();
  await page.getByRole('button', { name: 'SCRAMBLE LAUNCH' }).click();
  await expect(page.getByText(/TACTICAL INGRESS|INTERDICT CONVOY|EMERGENCY SCRAMBLE|STORM SCRAMBLE|BREAK THE AIR RAID|INTERCEPT SEA-SKIMMERS|PHASE 1|MISSION ACTIVE/)).toBeVisible();
});

test('builds a five-sortie operation and stores it in seed history', async ({ page }) => {
  await page.addInitScript((save) => localStorage.setItem('STRIKE_VECTOR_HARRIER_87_CAMPAIGN_V3', JSON.stringify(save)), completedCampaign);
  await page.goto('/');
  await page.getByRole('button', { name: 'DYNAMIC OPERATIONS', exact: true }).click();
  await page.getByRole('button', { name: '5 SORTIES' }).click();
  await page.getByRole('button', { name: 'REVIEW CONTRACT' }).first().click();
  await expect(page.getByText('SORTIE 1 OF 5 READY')).toBeVisible();
  await expect(page.getByText('MODIFIERS:')).toBeVisible();
  await page.getByRole('button', { name: 'Back to operations board' }).click();
  await expect(page.getByText('SEED HISTORY & FAVOURITES')).toBeVisible();
  const favourite = page.getByRole('button', { name: /Favourite IK-/ }).first();
  await favourite.click();
  await expect(page.getByRole('button', { name: /Remove IK-.*from favourites/ }).first()).toBeVisible();
});

test('decodes a shareable operation seed without network access', async ({ page }) => {
  await page.addInitScript((save) => localStorage.setItem('STRIKE_VECTOR_HARRIER_87_CAMPAIGN_V3', JSON.stringify(save)), completedCampaign);
  await page.goto('/');
  await page.getByRole('button', { name: 'DYNAMIC OPERATIONS', exact: true }).click();
  await page.getByLabel('CUSTOM / SHARED SEED').fill('SV-00001J7');
  await page.getByRole('button', { name: 'DECODE' }).click();
  await expect(page.getByText('IK-00001J7')).toBeVisible();
  await expect(page.getByText('SORTIE SEQUENCE')).toBeVisible();
});

test('unlocks deterministic Norwegian Sea operations after Mission 16', async ({ page }) => {
  await page.addInitScript((save) => localStorage.setItem('STRIKE_VECTOR_HARRIER_87_CAMPAIGN_V3', JSON.stringify({
    ...save,
    unlockedMission: 15,
    completedMissionIds: [
      ...save.completedMissionIds,
      'm11_cold_passage',
      'm12_hammerfall_fjord',
      'm13_troms_bridgehead',
      'm14_whiteout_rescue',
      'm15_red_tide',
      'm16_north_cape_assault',
    ],
  })), completedCampaign);
  await page.goto('/');
  await page.getByRole('button', { name: 'DYNAMIC OPERATIONS', exact: true }).click();
  await page.getByRole('button', { name: 'NORWEGIAN SEA', exact: true }).click();
  await expect(page.getByText('NORWEGIAN SEA OPERATIONS')).toBeVisible();
  await expect(page.getByText(/ARCTIC OPEN SEA|ARCTIC DEEP FJORD|ARCTIC BRIDGEHEAD|POLAR NIGHT PLATEAU|NORTH CAPE FORTRESS/).first()).toBeVisible();
  await page.getByRole('button', { name: 'REVIEW CONTRACT' }).first().click();
  await expect(page.getByText('SORTIE SEQUENCE')).toBeVisible();
  await expect(page.getByText('V3 // NORWEGIAN SEA')).toBeVisible();
});

test('preserves the 16:9 stage on an ultra-wide display', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'The ultra-wide geometry check runs once in the desktop browser project.');
  await page.setViewportSize({ width: 2200, height: 700 });
  await page.goto('/');

  const stage = page.locator('.game-stage');
  await expect(stage).toBeVisible();
  const bounds = await stage.boundingBox();

  expect(bounds).not.toBeNull();
  expect(bounds!.width / bounds!.height).toBeCloseTo(16 / 9, 2);
  expect(bounds!.height).toBeLessThanOrEqual(700);
});

test('level 2 painted backdrop covers both canvas edges', async ({ page }) => {
  await page.addInitScript((save) => localStorage.setItem('STRIKE_VECTOR_HARRIER_87_CAMPAIGN_V3', JSON.stringify(save)), completedCampaign);
  await page.goto('/');
  await page.getByRole('button', { name: 'CAMPAIGN', exact: true }).click();
  await page.getByRole('button', { name: 'Open strategic map' }).first().click();
  await page.getByRole('button', { name: 'Open Mission 2: Fjord SAM Suppression', exact: true }).click();
  await page.getByRole('button', { name: 'SCRAMBLE LAUNCH' }).click();
  await expect(page.getByText('OP VIPER CANYON')).toBeVisible();

  const canvas = page.locator('canvas').first();
  await expect(canvas).toBeVisible();
  await page.waitForTimeout(500);
  const edgeAlpha = await canvas.evaluate((element) => {
    const gameCanvas = element as HTMLCanvasElement;
    const context = gameCanvas.getContext('2d');
    if (!context) return [];
    const left = context.getImageData(0, 0, 1, gameCanvas.height).data;
    const right = context.getImageData(gameCanvas.width - 1, 0, 1, gameCanvas.height).data;
    return [left, right].map((edge) => {
      let transparentPixels = 0;
      for (let index = 3; index < edge.length; index += 4) {
        if (edge[index] !== 255) transparentPixels++;
      }
      return transparentPixels;
    });
  });

  expect(edgeAlpha).toEqual([0, 0]);
});

test('migrates a completed V3 campaign and launches Cold Passage from the Norwegian map', async ({ page }) => {
  await page.addInitScript((save) => localStorage.setItem('STRIKE_VECTOR_HARRIER_87_CAMPAIGN_V3', JSON.stringify({
    ...save,
    aircraftCondition: { health: 73, fuel: 42, subsystems: { engine: .8, flightControls: .9, targeting: 1, weapons: .7, hydraulics: .75, fuelTank: .95 } },
    selectedLoadout: 'STRIKE',
  })), completedCampaign);
  await page.goto('/');
  await page.getByRole('button', { name: 'CAMPAIGN', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Select Campaign Chapter' })).toBeVisible();
  await expect(page.getByText('10/10 missions complete')).toBeVisible();
  await expect(page.getByText('0/6 missions complete')).toBeVisible();
  await page.getByRole('button', { name: 'Open strategic map' }).nth(1).click();
  await expect(page.getByRole('heading', { name: 'The Norwegian Sea' })).toBeVisible();
  await expect(page.getByText('In production', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Route locked', { exact: true })).toHaveCount(5);
  await expect(page.getByText('Sortie ready')).toBeVisible();
  await expect(page.getByText('Airframe 73%')).toBeVisible();
  await expect(page.getByText('Loadout STRIKE')).toBeVisible();

  const migrated = await page.evaluate(() => JSON.parse(localStorage.getItem('STRIKE_VECTOR_HARRIER_87_CAMPAIGN_V4') || 'null'));
  expect(migrated).toMatchObject({ version: 4, activeChapter: 'NORWEGIAN_SEA', selectedLoadout: 'STRIKE' });

  await page.getByRole('button', { name: 'Open mission package' }).click();
  await expect(page.getByRole('heading', { name: 'OPERATION ICE GATE' })).toBeVisible();
  await expect(page.getByText('Positive identification is mandatory.')).toBeVisible();
  await page.getByRole('button', { name: 'SCRAMBLE LAUNCH' }).click();
  await expect(page.getByText('ESCORT THE REPLENISHMENT GROUP', { exact: true })).toBeVisible();
  await expect(page.getByText('LONG-RANGE CONTACTS')).toBeVisible();
});

test('unlocks and launches Hammerfall Fjord after Cold Passage', async ({ page }) => {
  await page.addInitScript((save) => localStorage.setItem('STRIKE_VECTOR_HARRIER_87_CAMPAIGN_V3', JSON.stringify({
    ...save,
    completedMissionIds: [...save.completedMissionIds, 'm11_cold_passage'],
  })), completedCampaign);
  await page.goto('/');
  await page.getByRole('button', { name: 'CAMPAIGN', exact: true }).click();
  await page.getByRole('button', { name: 'Open strategic map' }).nth(1).click();
  await expect(page.getByText('In production', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Route locked', { exact: true })).toHaveCount(4);
  await expect(page.getByText('Completed', { exact: true })).toBeVisible();
  await expect(page.getByText('Sortie ready', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Open mission package' }).click();
  await expect(page.getByRole('heading', { name: 'OPERATION HAMMERFALL' })).toBeVisible();
  await expect(page.getByText('Norwegian fishing homes at Hammarvik are protected.')).toBeVisible();
  await page.getByRole('button', { name: 'SCRAMBLE LAUNCH' }).click();
  await expect(page.getByText('LOW-LEVEL FJORD INGRESS', { exact: true })).toBeVisible();
  await page.keyboard.press('KeyI');
  await expect(page.getByText('HAMMERFALL CORRIDOR')).toBeVisible();
});

test('unlocks and launches Troms Bridgehead after Hammerfall Fjord', async ({ page }) => {
  await page.addInitScript((save) => localStorage.setItem('STRIKE_VECTOR_HARRIER_87_CAMPAIGN_V3', JSON.stringify({
    ...save,
    completedMissionIds: [...save.completedMissionIds, 'm11_cold_passage', 'm12_hammerfall_fjord'],
  })), completedCampaign);
  await page.goto('/');
  await page.getByRole('button', { name: 'CAMPAIGN', exact: true }).click();
  await page.getByRole('button', { name: 'Open strategic map' }).nth(1).click();
  await expect(page.getByText('In production', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Route locked', { exact: true })).toHaveCount(3);
  await expect(page.getByText('Completed', { exact: true })).toHaveCount(2);
  await expect(page.getByText('Sortie ready', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Open mission package' }).click();
  await expect(page.getByRole('heading', { name: 'OPERATION WINTER BRIDGE' })).toBeVisible();
  await expect(page.getByText('Protect NATO landing craft and beach stores.')).toBeVisible();
  await page.getByRole('button', { name: 'SCRAMBLE LAUNCH' }).click();
  await expect(page.getByText('AMPHIBIOUS FORCE APPROACHING', { exact: true })).toBeVisible();
  await expect(page.getByText('TROMS BRIDGEHEAD')).toBeVisible();
  await expect(page.getByText('TROMS LANDING FORCE INTEGRITY')).toBeVisible();
});

test('unlocks and launches Whiteout Rescue after Troms Bridgehead', async ({ page }) => {
  await page.addInitScript((save) => localStorage.setItem('STRIKE_VECTOR_HARRIER_87_CAMPAIGN_V3', JSON.stringify({
    ...save,
    completedMissionIds: [...save.completedMissionIds, 'm11_cold_passage', 'm12_hammerfall_fjord', 'm13_troms_bridgehead'],
  })), completedCampaign);
  await page.goto('/');
  await page.getByRole('button', { name: 'CAMPAIGN', exact: true }).click();
  await page.getByRole('button', { name: 'Open strategic map' }).nth(1).click();
  await expect(page.getByText('In production', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Route locked', { exact: true })).toHaveCount(2);
  await expect(page.getByText('Completed', { exact: true })).toHaveCount(3);
  await expect(page.getByText('Sortie ready', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Open mission package' }).click();
  await expect(page.getByRole('heading', { name: 'OPERATION SNOW ANGEL' })).toBeVisible();
  await expect(page.getByText('Follow the directional emergency beacon')).toBeVisible();
  await page.getByRole('button', { name: 'SCRAMBLE LAUNCH' }).click();
  await expect(page.getByText('FOLLOW THE EMERGENCY BEACON', { exact: true })).toBeVisible();
  await expect(page.getByText('EMERGENCY BEACON', { exact: true })).toBeVisible();
  await expect(page.getByText('WHITEOUT VISIBILITY')).toBeVisible();
});

test('unlocks and launches Red Tide after Whiteout Rescue', async ({ page }) => {
  await page.addInitScript((save) => localStorage.setItem('STRIKE_VECTOR_HARRIER_87_CAMPAIGN_V3', JSON.stringify({
    ...save,
    completedMissionIds: [...save.completedMissionIds, 'm11_cold_passage', 'm12_hammerfall_fjord', 'm13_troms_bridgehead', 'm14_whiteout_rescue'],
  })), completedCampaign);
  await page.goto('/');
  await page.getByRole('button', { name: 'CAMPAIGN', exact: true }).click();
  await page.getByRole('button', { name: 'Open strategic map' }).nth(1).click();
  await expect(page.getByText('In production', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Route locked', { exact: true })).toHaveCount(1);
  await expect(page.getByText('Completed', { exact: true })).toHaveCount(4);
  await expect(page.getByText('Sortie ready', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Open mission package' }).click();
  await expect(page.getByRole('heading', { name: 'OPERATION RED TIDE' })).toBeVisible();
  await expect(page.getByText('Each Nanuchka corvette carries exactly two sea-skimming missiles')).toBeVisible();
  await page.getByRole('button', { name: 'SCRAMBLE LAUNCH' }).click();
  await expect(page.getByText('FORM THE FORWARD FLEET SCREEN', { exact: true })).toBeVisible();
  await page.keyboard.press('KeyI');
  await expect(page.getByText('RED TIDE FLEET DEFENCE', { exact: true })).toBeVisible();
  await expect(page.getByText('NEXT THREAT WAVE', { exact: true })).toBeVisible();
});

test('unlocks and launches North Cape Assault after Red Tide', async ({ page }) => {
  await page.addInitScript((save) => localStorage.setItem('STRIKE_VECTOR_HARRIER_87_CAMPAIGN_V3', JSON.stringify({
    ...save,
    completedMissionIds: [...save.completedMissionIds, 'm11_cold_passage', 'm12_hammerfall_fjord', 'm13_troms_bridgehead', 'm14_whiteout_rescue', 'm15_red_tide'],
  })), completedCampaign);
  await page.goto('/');
  await page.getByRole('button', { name: 'CAMPAIGN', exact: true }).click();
  await page.getByRole('button', { name: 'Open strategic map' }).nth(1).click();
  await expect(page.getByText('Completed', { exact: true })).toHaveCount(5);
  await expect(page.getByText('Sortie ready', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Open mission package' }).click();
  await expect(page.getByRole('heading', { name: 'OPERATION MIDNIGHT SUN' })).toBeVisible();
  await expect(page.getByText('The command radar and fortress core are physically present but protected')).toBeVisible();
  await page.getByRole('button', { name: 'SCRAMBLE LAUNCH' }).click();
  await expect(page.getByText('PHASE 1 — BREAK THE NAVAL PICKET', { exact: true }).first()).toBeVisible();
  await page.keyboard.press('KeyI');
  await expect(page.getByText('NORTH CAPE ASSAULT', { exact: true })).toBeVisible();
  await expect(page.getByText('FLEET SCREEN CLEAR', { exact: true })).toBeVisible();
});

const actThreeMissions = [
  { button: 'Open Mission 7: Bridgehead Interdiction', title: 'BRIDGEHEAD INTERDICTION', operation: 'OPERATION BROKEN ARROW', phase: 'INTERDICT CONVOY' },
  { button: 'Open Mission 8: Janus Airbase Raid', title: 'JANUS AIRBASE RAID', operation: 'OPERATION BLACK BUCKLER', phase: 'COVERT INGRESS' },
  { button: 'Open Mission 9: Forward Base Defence', title: 'FORWARD BASE DEFENCE', operation: 'OPERATION STAND FAST', phase: 'EMERGENCY SCRAMBLE' },
  { button: 'Open Mission 10: Bastion Headquarters Assault', title: 'BASTION HEADQUARTERS ASSAULT', operation: 'OPERATION NORTHERN LANCE', phase: 'PHASE 1 — OUTER SAM BELT' },
];

for (const mission of actThreeMissions) {
  test(`launches authored finale: ${mission.title}`, async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('STRIKE_VECTOR_HARRIER_87_CAMPAIGN_V2', JSON.stringify({
        version: 2,
        unlockedMission: 9,
        completedMissionIds: [],
        bestScores: {},
        campaignFlags: [],
        difficulty: 'PILOT',
        renderQuality: 'HIGH',
        controlScale: 1,
        controlOpacity: 0.82,
        leftHanded: false,
      }));
    });
    await page.goto('/');
    await page.getByRole('button', { name: 'CAMPAIGN', exact: true }).click();
    await page.getByRole('button', { name: mission.button, exact: true }).click();
    await expect(page.getByRole('heading', { name: mission.operation })).toBeVisible();
    await page.getByRole('button', { name: 'SCRAMBLE LAUNCH' }).click();
    await expect(page.getByText(mission.phase, { exact: true })).toBeVisible();
  });
}
