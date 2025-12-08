# Bomb

A Kokimoki concept.

## Getting Started

### Prerequisites

- Node.js (v22 or higher)
- npm or yarn

### Installation

Install the dependencies:

```bash
npm install
```

### Development

Start the development server:

```bash
npm run dev
```

This will start a local development server where you can test your concept.

### Building

Build the concept for production:

```bash
npm run build
```

### Uploading to Kokimoki

To upload your concept to Kokimoki, run:

```bash
kokimoki upload
```

**Important:** Before uploading again, you must update the version in `package.json`. You can do this:

1. Using the npm version command:
   ```bash
   npm version patch  # for bug fixes
   npm version minor  # for new features
   npm version major  # for breaking changes
   ```

2. Or manually edit the `version` field in `package.json`

Uploading with the same version will fail. Always increment the version before running `kokimoki upload` again.

## Learn More

Visit [kokimoki.com](https://kokimoki.com) for more information and documentation.
