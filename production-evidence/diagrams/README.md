# Layer A diagrams (verified production case)

Freshly authored abstractions. **No private architecture diagram, schema or code was
copied or reconstructed.**

Each diagram has exactly one source of truth: the `.mmd` file. The `.svg` beside it is the
rendered output of that file and nothing else, so the two cannot drift. A plain-text
description follows each one for readers using a screen reader or viewing without images.

## System boundary

![System boundary: an authenticated user reaches a request handler inside a multi-tenant serverless application, which calls a generation path that is supplied its model identity by runtime configuration and writes generation telemetry, with the serving model held outside the trust boundary at an external provider.](layer-a-system-boundary.svg)

Source: [`layer-a-system-boundary.mmd`](layer-a-system-boundary.mmd)

Plain-text equivalent:

```
Client surface
  authenticated user
        |
        v
Application (multi-tenant, serverless)
  request handler --> generation path under test --> generation telemetry
                            ^
                            | supplies model identity at run time
                      runtime configuration
                            |
                            v
External model provider (outside the boundary, drawn dashed)
  serving model
```

The model identity is not a literal at the call site. It is supplied by runtime
configuration, which is what makes the migration a configuration change rather than a code
change.

## Configuration and activation evidence flow

![Configuration and activation evidence flow: a configuration value is changed and redeployed, after which the question of which model is actually serving has two answers. Deployment status yields intent rather than evidence and is drawn dashed. Generation telemetry yields the observed serving model, which is compared against the intended model; a match confirms activation, and a mismatch routes to a revert via the retained rollback target, which returns to the configuration change.](layer-a-config-activation-evidence-flow.svg)

Source: [`layer-a-config-activation-evidence-flow.mmd`](layer-a-config-activation-evidence-flow.mmd)

Plain-text equivalent:

```
configuration value changed -> redeploy -> which model is actually serving?
    via deployment status only -> intent, not evidence   (dashed: not accepted as proof)
    via generation telemetry   -> observed serving model
                                    matches intended?
                                      yes -> activation confirmed
                                      no  -> revert via retained rollback target
                                               -> back to configuration value changed
```

The point of this diagram is the fork: deployment status reports what was **intended**.
Only telemetry reports what **happened**.
