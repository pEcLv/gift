# Planet Vortex Transition Design

## Context

The solar system scene in `solar_system.html` currently switches planets by updating particle target buffers and letting the render loop interpolate positions toward the new planet. The result is functional but visually plain because the previous planet shape simply becomes the next one.

The approved direction is a medium-strength "vortex reconstruction" transition: particles appear to loosen from the current planet, swirl through a tilted orbital band while changing color, then collapse into the newly selected planet. The effect should feel intentional and cinematic without slowing frequent planet navigation.

## Goals

- Make planet switching visibly richer than direct interpolation.
- Preserve responsiveness for bottom nav clicks and gesture-based planet switching.
- Reuse the current Three.js particle buffers, shader materials, and animation loop.
- Keep the transition bounded to planet mode; initial load and immediate switches should remain instant.

## Non-Goals

- Do not add animation libraries.
- Do not rewrite the particle renderer or move this scene into a framework.
- Do not introduce queued transitions; the newest planet selection wins.
- Do not change the outer `index.html` tree/planet iframe switch behavior.

## User Experience

When the user selects a planet, the UI state updates immediately: the active nav button, readout text, and CSS accent color all reflect the selected planet. The particle body then performs a roughly 1.05 to 1.15 second transition:

1. **Breakup:** The current sphere slightly contracts and loosens outward, keeping enough shape continuity to avoid a chaotic explosion.
2. **Vortex:** Particles follow a tilted orbital ring or spiral band around the planet center.
3. **Color Shift:** During the middle of the vortex, particle colors blend from their current colors toward the selected planet's palette.
4. **Reconstruction:** The vortex tightens and particles settle onto the selected planet's body and ring targets.

If another planet is selected before the animation ends, the next transition starts from the particles' current positions and aims at the newest planet. No intermediate planets are queued.

## Architecture

Add a small transition controller object near the existing planet state:

```js
const planetTransition = {
    active: false,
    startedAt: 0,
    duration: 1.1,
    fromKey: "saturn",
    toKey: "saturn",
    colorProgress: 1
};
```

The controller should be updated by `switchPlanet(key, immediate = false)` and consumed by the existing animation loop. This keeps transition state centralized and avoids scattering timing checks across UI event handlers.

The implementation should continue using:

- `bodyPositions` and `ringPositions` as the current rendered attributes.
- `bodyTargets` and `ringTargets` as the final destination for the selected planet.
- `bodyColors` and `ringColors` as color attributes.
- `moveBodyAttribute()` and `moveRingAttribute()` as the per-frame movement points.

## Data Flow

For a normal planet switch:

1. `switchPlanet(key)` validates the key and records the previous active planet.
2. The function updates `activePlanetKey`, readout UI, atmosphere target, core target, shader type, and ring uniforms as it does today.
3. `setBodyTargets(planet)` and `setRingTargets(planet)` calculate final positions and target colors for the new planet.
4. A transition is started unless `immediate` is true.
5. On each frame, the animation loop computes normalized progress from `clock.getElapsedTime()`.
6. `moveBodyAttribute()` and `moveRingAttribute()` blend toward a temporary vortex target before settling on the final target.

For `immediate = true`, existing instant behavior remains: positions copy directly to targets, material uniforms snap to target values, and no transition is active.

## Motion Model

Use one eased progress value and derive phase weights:

- `breakupWeight`: strongest near the beginning.
- `vortexWeight`: strongest in the middle.
- `rebuildWeight`: strongest near the end.
- `colorMix`: begins after breakup and reaches full target color before reconstruction completes.

The temporary body position for each particle should be based on deterministic seed data already present in `bodySeeds`:

- Start with `bodyTargets[index]` as the final destination.
- Compute a radial direction from the current target or seed sphere position.
- Compute a tangent direction using a cross product with an up vector.
- Build a tilted vortex point using seed theta, orbit, shell, and noise.
- Interpolate rendered positions toward `mix(finalTarget, vortexTarget, vortexWeight)`.

The vortex should be tilted similarly to a ring plane, so it reads as an orbital reconstruction instead of random scatter. Body particles should stay closer to the center than ring particles to avoid the whole object becoming too wide on mobile.

Ring particles should use the same transition controller but a wider vortex radius. When switching to a planet without rings, their opacity should still ease down through the existing `targetRingOpacity` behavior.

## Color Model

`setBodyTargets()` currently writes final target colors directly into `bodyColors`. To make the mid-transition color shift visible, use dedicated source and destination color buffers.

- Add `bodyColorFrom`, `bodyColorTo`, `ringColorFrom`, and `ringColorTo`.
- Before setting new targets, copy current color attributes into the `from` buffers.
- Let `setBodyTargets()` and `setRingTargets()` write target colors into the visible color arrays, then copy those arrays into the `to` buffers before restoring/interpolating the visible arrays.
- During the transition, update the visible color attributes by interpolating from `from` to `to` using `colorMix`.
- After transition completion, copy `to` into the visible color arrays and stop color updates.

This keeps color motion CPU-side and compatible with the existing vertex-color shaders.

## Interaction Rules

- Bottom nav planet clicks start the transition.
- Gesture relative switches start the same transition through `switchPlanet()`.
- Pointer drag, mouse force field, camera zoom, and gesture spread continue to work during the transition.
- A new selection during an active transition interrupts it and starts from the current visible positions and colors.
- Transition duration should be short enough that rapid exploration still feels responsive.

## Error Handling

- If `switchPlanet()` receives an invalid key, it returns without changing state.
- If particle buffers are not initialized, immediate setup paths should remain safe and avoid transition-specific work.
- The transition controller should clamp progress to `[0, 1]`.
- When progress reaches `1`, mark the transition inactive and ensure visible positions/colors match final target buffers.

## Testing

Add source-level tests similar to the existing scripts:

- Verify `solar_system.html` defines a planet transition controller.
- Verify `switchPlanet()` starts a transition for non-immediate changes.
- Verify `immediate` planet switching still copies positions directly and does not leave a transition active.
- Verify body and ring movement functions account for transition progress.
- Verify color interpolation buffers or equivalent color transition logic are present.

Manual verification should cover:

- Switch Saturn to Earth, Earth to Mars, and Jupiter to Uranus.
- Interrupt a transition by clicking another planet mid-animation.
- Use gesture-based left/right switching.
- Check mobile viewport framing so the vortex does not overflow the primary visual area.
- Confirm the initial embedded planet scene still loads directly into Saturn without playing a transition.

## Implementation Notes

The safest implementation path is incremental:

1. Add transition state and tests that detect the state hooks.
2. Add color snapshot/mix buffers.
3. Add vortex target math to body and ring movement.
4. Tune duration, radius, and easing values through browser verification.

Avoid changing planet palettes, readout copy, or the general scene layout while implementing this transition.
