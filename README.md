# Auth Builder

A comprehensive authentication and authorization software that can be integrated into other products to provide authentication and authorization services.

## Features

- **User Management**: Create, edit, and manage users with role-based access control
- **Realm Management**: Multi-tenant architecture with realm-based isolation
- **Client Management**: OAuth-like client management with SMTP configuration
- **Role-Based Access Control**: Fine-grained permissions with URL and method-level access control
- **Two-Factor Authentication**: Optional 2FA for enhanced security
- **OTP System**: Password reset and 2FA verification via email
- **Token Management**: Custom access and refresh tokens with auto-extension
- **SMTP Integration**: Configurable email service for notifications and OTP delivery

## Architecture

- **Backend**: Node.js + Express + PostgreSQL
- **Frontend**: React + Vite + Tailwind CSS
- **Database**: PostgreSQL with Docker persistence
- **Containerization**: Docker Compose for easy deployment

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for local development)

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd auth-builder
```

### 2. Environment Setup

Copy the example environment file and configure it:

```bash
cp env.example .env
```

Edit `.env` with your actual values:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=auth_builder
DB_USER=auth_user
DB_PASSWORD=auth_password

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-in-production

# Default SMTP Configuration
DEFAULT_SMTP_HOST=smtp.gmail.com
DEFAULT_SMTP_PORT=587
DEFAULT_SMTP_SECURE=false
DEFAULT_SMTP_USER=your-email@gmail.com
DEFAULT_SMTP_PASS=your-app-password
DEFAULT_SMTP_REQUIRE_TLS=true
DEFAULT_SMTP_AUTH_METHOD=PLAIN

# Server Configuration
PORT=3000
NODE_ENV=development
```

### 3. Start with Docker Compose

```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### 4. Access the Application

- **Backend API**: http://localhost:3000
- **Frontend**: http://localhost:5173
- **Health Check**: http://localhost:3000/api/health

### 5. Default Admin User

The system automatically creates a default admin user:
- **Email**: admin@admin.com
- **Password**: Admin@123

## API Endpoints

### Authentication
- `POST /api/auth/login` - User login (2FA-aware)
- `POST /api/auth/validate-otp` - 2FA verification
- `POST /api/auth/refresh` - Refresh access token
- `POST /api/auth/logout` - User logout
- `POST /api/auth/forgot-password` - Send password reset OTP
- `POST /api/auth/reset-password` - Reset password with OTP
- `POST /api/auth/resend-otp` - Resend OTP
- `POST /api/auth/validate-request` - Validate external request permissions

### User Management
- `GET /api/users` - List users
- `POST /api/users` - Create user
- `PUT /api/users/:id` - Update user
- `DELETE /api/users/:id` - Delete user
- `PATCH /api/users/:id/toggle-status` - Toggle user status

### Realm Management
- `GET /api/realms` - List realms
- `POST /api/realms` - Create realm
- `PUT /api/realms/:id` - Update realm
- `DELETE /api/realms/:id` - Delete realm

### Client Management
- `GET /api/clients` - List clients
- `POST /api/clients` - Create client
- `PUT /api/clients/:id` - Update client
- `DELETE /api/clients/:id` - Delete client

### Role Management
- `GET /api/roles` - List roles
- `POST /api/roles` - Create role
- `PUT /api/roles/:id` - Update role
- `DELETE /api/roles/:id` - Delete role
- `POST /api/roles/:id/assign-user` - Assign role to user

## Database Schema

The system uses the following main tables:
- `users` - User accounts and authentication
- `realms` - Multi-tenant isolation
- `clients` - OAuth-like client applications
- `roles` - Role definitions with access control
- `user_roles` - User-role associations
- `tokens` - Access and refresh token management
- `otps` - One-time password storage

## Development

### Local Development

```bash
# Backend
npm install
npm run dev

# Frontend
cd frontend
npm install
npm run dev
```

### Docker Development

```bash
# Rebuild containers after code changes
docker-compose build --no-cache

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

## Security Features

- **Password Hashing**: bcrypt with salt rounds
- **Token Security**: Custom tokens with configurable expiry
- **Role-Based Access**: Fine-grained URL and method permissions
- **2FA Support**: Optional email-based two-factor authentication
- **SMTP Security**: Configurable SMTP with fallback options
- **Input Validation**: Express-validator for all API inputs

## Integration

### External Application Integration

Use the `/api/auth/validate-request` endpoint to validate requests from external applications:

```bash
curl -X POST http://localhost:3000/api/auth/validate-request \
  -H "Authorization: Bearer <ACCESS_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{
    "host": "api.example.com",
    "route": "/api/client/get_name",
    "method": "GET"
  }'
```

### Client Configuration

Configure clients with:
- **Endpoints**: Allowed host domains
- **SMTP**: Email configuration for notifications
- **2FA**: Enable/disable two-factor authentication
- **SSO**: Single sign-on configuration

## Troubleshooting

### Common Issues

1. **Backend won't start**: Check PostgreSQL connection and environment variables
2. **Frontend won't load**: Verify Vite dev server is running on port 5173
3. **Email not sending**: Check SMTP configuration and credentials
4. **Database connection failed**: Ensure PostgreSQL container is healthy

### Logs

```bash
# View all logs
docker-compose logs

# View specific service logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs postgres
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the logs
3. Create an issue in the repository
