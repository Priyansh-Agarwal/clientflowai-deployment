# Contributing to ClientFlow AI Suite

Thank you for your interest in contributing to ClientFlow AI Suite! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Contributing Process](#contributing-process)
- [Coding Standards](#coding-standards)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)

## Code of Conduct

This project adheres to a code of conduct. By participating, you are expected to uphold this code. Please report unacceptable behavior to conduct@clientflow.ai.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/your-username/clientflow-ai-suite.git`
3. Create a feature branch: `git checkout -b feature/amazing-feature`
4. Make your changes
5. Commit your changes: `git commit -m 'Add some amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## Development Setup

### Prerequisites

- Node.js 18.19.0 or higher
- pnpm 8.0.0 or higher
- Docker and Docker Compose
- Git

### Installation

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Copy environment files:
   ```bash
   cp env/api/env.example apps/api/.env
   cp env/web/env.example apps/web/.env
   cp env/worker/env.example apps/worker/.env
   ```

3. Start development servers:
   ```bash
   pnpm dev
   ```

This will start:
- Web app on http://localhost:3000
- API server on http://localhost:4000
- Worker in watch mode

### Project Structure

```
clientflow-ai-suite/
├── apps/
│   ├── web/          # Next.js 14 frontend
│   ├── api/          # Express.js API server
│   └── worker/       # BullMQ worker
├── packages/
│   ├── ui/           # Shared UI components
│   ├── types/        # Shared TypeScript types
│   ├── clients/      # API clients
│   ├── tsconfig/     # TypeScript configurations
│   └── eslint-config/ # ESLint configurations
└── env/              # Environment files
```

## Contributing Process

### 1. Choose an Issue

- Look for issues labeled `good first issue` for beginners
- Check the project board for current priorities
- Comment on the issue to indicate you're working on it

### 2. Create a Branch

- Branch from `main`
- Use descriptive branch names: `feature/user-authentication`, `fix/api-error-handling`
- Keep branches focused on a single feature or fix

### 3. Make Changes

- Follow the coding standards outlined below
- Write tests for new features
- Update documentation as needed
- Ensure all tests pass

### 4. Submit a Pull Request

- Provide a clear description of changes
- Reference any related issues
- Request review from appropriate team members

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Enable strict mode
- Use proper type annotations
- Avoid `any` type when possible

### Code Style

- Use Prettier for formatting
- Follow ESLint rules
- Use meaningful variable and function names
- Write self-documenting code

### Commit Messages

Use conventional commits format:

```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

### Testing

- Write unit tests for new features
- Write integration tests for API endpoints
- Maintain test coverage above 80%
- Use descriptive test names

### Documentation

- Update README files when adding features
- Document API changes
- Add JSDoc comments for complex functions
- Update type definitions

## Pull Request Process

### Before Submitting

1. Ensure all tests pass: `pnpm test`
2. Run linting: `pnpm lint`
3. Run type checking: `pnpm typecheck`
4. Update documentation if needed
5. Rebase on latest main branch

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added/updated
- [ ] No breaking changes (or documented)
```

### Review Process

1. Automated checks must pass
2. At least one team member must approve
3. Address all review comments
4. Maintain clean commit history

## Issue Reporting

### Bug Reports

When reporting bugs, include:

- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details
- Screenshots if applicable

### Feature Requests

For feature requests, include:

- Clear description of the feature
- Use case and motivation
- Proposed implementation (if any)
- Alternative solutions considered

## Development Guidelines

### API Development

- Follow RESTful conventions
- Use proper HTTP status codes
- Implement proper error handling
- Add request/response validation
- Document endpoints

### Frontend Development

- Use TypeScript
- Follow React best practices
- Implement responsive design
- Use accessible components
- Optimize for performance

### Database Changes

- Create migration files
- Test migrations thoroughly
- Consider backward compatibility
- Update type definitions

## Getting Help

- Check existing issues and discussions
- Join our Discord community
- Email us at dev@clientflow.ai
- Schedule office hours with maintainers

## Recognition

Contributors will be recognized in:
- CONTRIBUTORS.md file
- Release notes
- Project documentation
- Community highlights

Thank you for contributing to ClientFlow AI Suite! 🚀

