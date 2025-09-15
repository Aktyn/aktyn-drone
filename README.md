# Aktyn Drone

This project is a monorepo for controlling a drone over a P2P connection. It consists of two main applications: a drone computer application that runs on the drone itself, and a mobile pilot application that can be used to control the drone from a web browser.

## Architecture

The project is structured as a monorepo using [Turborepo](https://turbo.build/).

* `apps/drone-computer`: A Node.js application that runs on the drone (e.g., a Raspberry Pi). It handles flight control, video streaming, and P2P communication.
* `apps/mobile-pilot`: A React application that provides a web-based interface for controlling the drone. It displays a live video feed, a map with the drone's location, and controls for piloting the drone.
* `packages/common`: A shared package containing code used by both the drone computer and the mobile pilot applications, such as data structures for P2P communication.

## Getting Started

### Prerequisites

* [Node.js](https://nodejs.org/) (v18 or later)
* [npm](https://www.npmjs.com/) (v10 or later)

### Installation

1. Clone the repository:

    ```bash
    git clone https://github.com/Aktyn/aktyn-drone.git
    ```

1. Install the dependencies:

    ```bash
    npm install
    ```

### Running the applications

To start both the drone computer and the mobile pilot applications in development mode, run the following command from the root of the project:

```bash
npm run dev
```

This will start the drone computer in watch mode and the mobile pilot application with a Vite development server.

You can also run the applications with mock data for development without the actual drone hardware:

```bash
npm run dev:mock
```

Alternatively you can execute `run.sh` script from the root of the project.\
This script will automatically fetch the latest changes from the repository, install dependencies, build the project and start **drone-computer**.\
Meant to be run on drone device (e.g. Raspberry Pi).

## Available Scripts

* `npm run build`: Builds all applications.
* `npm run dev`: Starts all applications in development mode.
* `npm run dev:mock`: Starts all applications in development mode with mock data.
* `npm run start`: Starts all applications in production mode.
* `npm run lint`: Lints the codebase.
* `npm run typecheck`: Runs the TypeScript compiler to check for type errors.
* `npm run format`: Formats the codebase with Prettier.
