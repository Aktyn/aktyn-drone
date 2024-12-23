# Aktyn Drone

Raspberry Pi to flight controller interface with p2p-based connectivity, web controls, and real-time camera stream preview.

## Project Structure
```
.
├── packages/
│   └── common/         # Shared types and utilities
├── workspaces/
│   ├── drone-computer/ # Raspberry Pi control software
│   └── mobile-pilot/   # Web-based pilot interface
```

## Requirements
- Deno 1.x or higher

## Development
1. Install dependencies:
```bash
deno task check
```

2. Start the drone computer:
```bash
deno task start:drone
```

3. Start the pilot interface:
```bash
deno task start:pilot
```

## License
GPL-3.0-only
