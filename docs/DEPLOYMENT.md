# How to Deploy KADA Connect Backend to Render Production

## Purpose

Deploy the KADA Connect backend API to Render production environment with zero infrastructure costs, security hardening, and performance optimization through automated GitHub deployment.

## Prerequisites

### Required Tools and Accounts
- **Render Account**: Create account at https://render.com
- **GitHub Repository**: Public or private repository containing the code
- **Node.js**: Version 18 or higher
- **npm**: Node Package Manager
- **Git**: Version control system
- **Supabase Project**: Database and authentication service
- **Google Cloud Project**: For image proxy service account

### Required Credentials
- Supabase project URL and service key
- Google Drive API service account credentials
- Frontend domain(s) for CORS configuration

## Configuration Setup

### 1. Environment Variables Setup
Copy the example environment file:
```bash
cp .env.example .env
```

Configure the following environment variables:
```bash
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
JWT_SECRET=your-jwt-secret-key

# Google Drive Service Account
GOOGLE_PROJECT_ID=your-google-project-id
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...private-key-content...\n-----END PRIVATE KEY-----\n"

# Server Configuration
NODE_ENV=production

# CORS and API Configuration
ALLOWED_ORIGINS=http://localhost:3001,http://localhost:5173,https://kada-connect.vercel.app
API_BASE_URL=https://kada-connect-be.onrender.com
```

### 2. Render Application Configuration
The `render.yaml` file is pre-configured for optimal deployment:
- **Platform**: Render free tier web service
- **Auto-scaling**: Automatic scaling based on traffic
- **Health checks**: Automated monitoring at `/health` endpoint
- **GitHub Integration**: Automatic deployment on git push
- **Caching**: In-memory caching (no persistent volumes required)

## Step-by-Step Deployment

### 1. Connect GitHub Repository to Render
1. Log in to your Render account at https://render.com
2. Click **New +** and select **Web Service**
3. Connect your GitHub repository containing the KADA Connect backend
4. Select the repository and branch (typically `main` or `master`)
5. Render will automatically detect the Node.js application

### 2. Configure Environment Variables
In the Render dashboard, add the following environment variables:
```bash
# Supabase Configuration
SUPABASE_URL=your-production-supabase-url
SUPABASE_SERVICE_KEY=your-production-service-key
JWT_SECRET=your-jwt-secret-key

# Google Drive Service Account
GOOGLE_PROJECT_ID=your-google-project-id
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...private-key-content...\n-----END PRIVATE KEY-----\n"

# Server Configuration
NODE_ENV=production

# CORS and API Configuration
ALLOWED_ORIGINS=http://localhost:3001,http://localhost:5173,https://kada-connect.vercel.app
API_BASE_URL=https://kada-connect-be.onrender.com
```

### 3. Deploy Application
1. Click **Create Web Service** to start the deployment
2. Render will automatically:
   - Build the Docker image
   - Deploy the application
   - Assign a URL like `https://kada-connect-be.onrender.com`
   - Run health checks

### 4. Verify Deployment
Test the health endpoint:
```bash
curl https://kada-connect-be.onrender.com/health
```

Expected response:
```json
{
  "status": "OK",
  "message": "KADA Connect Backend is running",
  "timestamp": "2024-01-20T15:30:00.000Z",
  "version": "1.0.0"
}
```

### 5. Enable Auto-Deployment
In your Render service settings:
- Enable **Auto-Deploy** on push to main branch
- Configure branch-specific deployment if needed
- Set up manual deployment triggers for controlled releases

## Production Configuration Details

### Render Configuration Breakdown
- **Service Name**: `kada-connect-backend`
- **Service Type**: Web Service (Node.js)
- **Plan**: Free tier (with automatic scaling)
- **Port**: 10000 (Render standard)
- **Resources**: Free tier resources with automatic scaling
- **Health Check**: Automated monitoring at `/health` endpoint
- **SSL**: Automatic HTTPS certificate

### Docker Configuration
The application uses a multi-stage Docker build:
- **Base Image**: Node.js 18-alpine
- **Security**: Non-root user (nodejs:nodejs)
- **Optimization**: Production dependencies only
- **Health Check**: Built-in health endpoint monitoring
- **Port**: Exposes 10000 for Render compatibility

### Cache Configuration
- **Type**: In-memory caching using NodeCache
- **Image Cache**: 24-hour TTL, 500MB maximum, 1000 max keys
- **API Cache**: 1-hour TTL for Google Drive responses, 500 max keys
- **Cost**: Zero (no persistent storage required)
- **Management**: Automatic cleanup and TTL enforcement

### Security Configuration
- **CORS**: Configured for specified frontend domains
- **Rate Limiting**: 300 requests per 15 minutes for proxy endpoints
- **Security Headers**: Helmet.js protection enabled
- **Input Validation**: Comprehensive Joi validation schemas
- **HTTPS**: Automatic SSL certificate provided by Render

## Verification and Testing

### 1. Health Check Verification
```bash
curl https://kada-connect-be.onrender.com/health
```

### 2. API Functionality Testing
```bash
# Test search endpoints
curl "https://kada-connect-be.onrender.com/api/students/search?q=python"
curl "https://kada-connect-be.onrender.com/api/companies/search?q=technology"

# Test lookup endpoints
curl https://kada-connect-be.onrender.com/api/industries
curl https://kada-connect-be.onrender.com/api/students/skills

# Test proxy functionality
curl "https://kada-connect-be.onrender.com/api/proxy/image?url=https%3A%2F%2Fexample.com%2Fimage.jpg"
```

### 3. CORS Configuration Testing
Test from frontend domain:
```bash
curl -H "Origin: https://kada-connect.vercel.app" \
     https://kada-connect-be.onrender.com/api/industries
```

### 4. Performance Baseline
Monitor response times and cache performance:
```bash
curl https://kada-connect-be.onrender.com/api/cache/status
```

### 5. GitHub Auto-Deployment Testing
1. Make a small change to your code
2. Commit and push to GitHub
3. Monitor the deployment in Render dashboard
4. Verify the changes are live on the Render URL

## Common Issues and Solutions

### Environment Variable Errors
**Problem**: Application fails to start due to missing environment variables
**Solution**: Verify all required variables are set in Render dashboard:
1. Go to your Render service dashboard
2. Click **Environment** tab
3. Check that all required variables are configured correctly

### Database Connection Issues
**Problem**: Supabase connection errors
**Solution**:
1. Verify Supabase URL and service key format in Render dashboard
2. Ensure service key has required permissions
3. Test connection locally before deployment
4. Check Render logs for connection errors

### CORS Configuration Issues
**Problem**: Frontend cannot access API endpoints
**Solution**:
1. Verify frontend domain is in ALLOWED_ORIGINS in Render dashboard
2. Check API_BASE_URL includes frontend domain
3. Test CORS preflight requests
4. Ensure custom domain is properly configured if used

### Build Failures
**Problem**: Application fails to build or deploy
**Solution**:
1. Check Render logs for detailed error messages
2. Verify Docker build works locally: `docker build -t test .`
3. Check package.json dependencies are correct
4. Ensure all files are committed to Git repository

### Runtime Errors
**Problem**: Application crashes after deployment
**Solution**:
1. View real-time logs in Render dashboard
2. Check for missing environment variables
3. Verify all required services (Supabase, Google Drive) are accessible
4. Test health endpoint: `curl https://your-service.onrender.com/health`

### Auto-Deployment Issues
**Problem**: GitHub auto-deployment not working
**Solution**:
1. Verify GitHub repository is connected to Render
2. Check auto-deploy is enabled in service settings
3. Ensure the correct branch is selected
4. Check GitHub Actions status if configured
5. Manually trigger deployment to test connection

### Rollback Procedure
If deployment causes issues:
1. Render automatically maintains previous working deployment
2. Push a fix or revert the problematic commit
3. Deploy will automatically update to the fixed version
4. Use manual deployment for controlled releases

## Maintenance and Updates

### Redeployment Process
For application updates:
1. Update code in your local repository
2. Test changes locally
3. Commit and push to GitHub
4. Render will automatically deploy the changes
5. Monitor deployment status in Render dashboard

### Environment Variable Management
Update environment variables in Render dashboard:
1. Go to your service dashboard
2. Click **Environment** tab
3. Add or update variables
4. Save changes (may trigger redeploy)

### Monitoring and Logging
View application logs:
1. Go to Render service dashboard
2. Click **Logs** tab for real-time logs
3. Use search and filtering for specific issues
4. Download logs for analysis if needed

### Performance Monitoring
Monitor application metrics:
- Render dashboard: Built-in metrics and health status
- Health check endpoint: `/health`
- Cache statistics: `/api/cache/status`
- Proxy statistics: `/api/proxy/stats`
- Response times and error rates

### Cache Management
Clear cache if needed:
```bash
curl -X POST https://kada-connect-be.onrender.com/api/cache/clear
```

### GitHub Integration Management
Configure auto-deployment settings:
1. Go to service settings in Render dashboard
2. Enable/disable auto-deploy on branch push
3. Configure branch-specific deployment rules
4. Set up manual deployment triggers
5. Monitor deployment history and rollback options

## Cost Optimization

### Zero-Cost Configuration
- **Render Free Tier**: Complete free plan with all features included
- **No Persistent Volumes**: Uses in-memory caching (no storage costs)
- **Automatic Scaling**: Scale up/down based on traffic automatically
- **SSL Certificates**: Free HTTPS certificates included
- **Built-in Monitoring**: Free logs and metrics dashboard

### Resource Usage Monitoring
Track usage through Render dashboard:
- Response times and error rates
- Memory and CPU usage metrics
- Request volume and patterns
- Deployment history and rollback options

### Cost Optimization Strategies
- **In-Memory Caching**: Leverage existing NodeCache system
- **Efficient API Design**: Optimize database queries and responses
- **Image Optimization**: Use proxy service for external images
- **Automatic Scaling**: Let Render handle traffic fluctuations

## Troubleshooting Checklist

Before deployment:
- [ ] All environment variables configured correctly in Render dashboard
- [ ] Supabase connection tested locally
- [ ] Google Drive service account permissions verified
- [ ] Frontend domains added to CORS configuration
- [ ] Application builds successfully locally
- [ ] Health endpoint responds correctly
- [ ] GitHub repository connected to Render
- [ ] Auto-deployment enabled in service settings

After deployment:
- [ ] Health endpoint accessible at Render URL
- [ ] API endpoints respond correctly
- [ ] CORS configuration works with frontend
- [ ] Images load through proxy service
- [ ] Cache functionality works properly
- [ ] No critical errors in Render logs
- [ ] Auto-deployment functioning correctly
- [ ] Performance metrics within expected ranges

## Support Resources

- **Render Documentation**: https://render.com/docs
- **Supabase Documentation**: https://supabase.com/docs
- **API Documentation**: `/docs/API.md`
- **Google Drive Proxy Setup**: `/docs/GOOGLE_DRIVE_PROXY_SETUP.md`

## Notes

This deployment configuration is optimized for production use with Render's free tier, automatic scaling, and comprehensive monitoring. The application automatically deploys on git push, includes security hardening, in-memory caching optimization, and CORS configuration for seamless frontend integration. The platform provides zero infrastructure costs while maintaining high performance and reliability.