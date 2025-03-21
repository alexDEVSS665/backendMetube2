# meTube_backend

# MeTube Backend Setup

## 1. Download and Extract Files

- Open the `backend` folder in VS Code.

## 2. Install MongoDB (Choose One Option)

### Option 1: Install MongoDB Locally

- If you want to install MongoDB on your system, use the MongoDB Community Kubernetes Operator.

### Option 2: Use MongoDB Online

- Instead of `mongodb://localhost:27017/`, use an online MongoDB URL (e.g., MongoDB Atlas or a cloud provider).

## 3. Create `.env` File

Inside the `backend` folder, create a `.env` file with the following content:

```env
MONGODB_CONNECTION_STRING=mongodb://localhost:27017/
  # Change if using an online URL

# Authentication secrets
JWT_SECRET=
secretKey=

# Server configuration
PORT=3001

# AWS Wasabi S3 Configuration
hostname=s3.ap-southeast-1.wasabisys.com  # From Wasabi
endpoint=s3.ap-southeast-1.wasabisys.com
region=ap-southeast-1
aws_access_key_id=000
aws_secret_access_key=000
bucketName=metube  # Your Wasabi bucket name

# Nodemailer Email Configuration (Ethereal)
EMAIL=bernard.thiel@ethereal.email
PASSWORD=s8MYdmkaykmEUDJ6WT

appName=Bernard Thiel

baseURL=
```

## 4. Install Dependencies and Start the Server

Run the following commands in the VS Code terminal:

```sh
npm i                # Install dependencies
npm i nodemon -g     # Install nodemon globally (optional)
npm start            # Start the server
```

## 5. Open Postman and Check API

### Register Admin

**Method:** `POST`

**URL:** `http://localhost:3001/admin/admin/create`

**Body:**

```json
{
  "email": "test@gmail.com",
  "password": "123",
  "code": "51562687"
}
```

**Response:**

```json
{
  "status": true,
  "message": "Admin created Successfully!",
  "admin": {
    "name": "",
    "email": "test",
    "password": "eff97473b25dc263bf9707e51fd6e4d4c858b0705fe7ae76e2af19ab2e43f7dc20400e15a08f4c723f1b67e2a7561cc471f0177ef6785716b8e6c8343d349b38facada49b2e67da1a1d34267759963eb2392c199a5820c0fd65976cbb675750962c23d",
    "image": "",
    "purchaseCode": "51562687",
    "_id": "67d3e83e8f3d59900d886c7e",
    "createdAt": "2025-03-14T08:26:39.059Z",
    "updatedAt": "2025-03-14T08:26:39.059Z"
  }
}
```

### Login Admin

**Method:** `POST`

**URL:** `http://localhost:3001/admin/admin/login`

**Body:**

```json
{
  "email": "test@gmail.com",
  "password": "123"
}
```

**Response (Status 200):**

```json
{
  "status": true,
  "message": "Admin login Successfully!",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJfaWQiOiI2N2QyYTVjYmMzYzZlMWJiZTIyYjA5NjQiLCJuYW1lIjoiIiwiZW1haWwiOiJ0ZXN0IiwiaW1hZ2UiOiIiLCJwYXNzd29yZCI6ImJhNDc3NDlkYjU1ZWExODA5MDUxNmYwYzAzY2NiNDZlNDI3M2MyZjNiZjE2Y2U0ZWU0ZGNlY2E2YWEwYjVhYTU4YmMxMWRkMTZkOGQ5YWExNDc0MDIxNDRhODdjM2M3YTJhYzgyZGI5ZjZkYWYzOTNjYTU5ZGYxN2MyNDNjMDIxMDE4NTczOTFlZmM3OTcwMmVkZWY1MDFhOTVkYjJiYTdlYjZiMzFkNDQzNTI1M2VmODljYTNjMjE3NTFhMGIyMDVlZGQzYyIsImlhdCI6MTc0MTk0MDY1Mn0.BjIsoh69nYuVsK_1LxtFTUTzjhXarPgaovDdu2gKqXs"
}
```
