# Property Data Service Documentation

## Table of Contents
1. [Introduction](#introduction)
2. [Architecture](#architecture)
   - [Component Overview](#component-overview)
   - [Component Separation Benefits](#component-separation-benefits)
3. [Design Philosophy](#design-philosophy)
   - [Canonical Fields Dictionary](#canonical-fields-dictionary)
   - [Configuration-Oriented Approach](#configuration-oriented-approach)
4. [System Requirements](#system-requirements)
5. [Setup & Configuration](#setup--configuration)
   - [Environment Variables](#environment-variables)
   - [Source Configuration](#source-configuration)
6. [Installation & Operation](#installation--operation)
   - [Installation](#installation)
   - [Running the API Server](#running-the-api-server)
   - [Running the Ingestion Worker](#running-the-ingestion-worker)
7. [API Reference](#api-reference)
   - [Available Endpoints](#available-endpoints)
   - [Query Parameters](#query-parameters)
   - [Response Format](#response-format)

## Introduction

The Property Data Service provides a RESTful API for querying property data along with a separate worker process for data ingestion from various sources. The system is designed to standardize and consolidate property data from multiple sources with different schemas into a unified format for easy access and analysis.

## Architecture

### Component Overview

The application is divided into two main components:

1. **API Server**: Handles HTTP requests for property data, providing filtering and pagination capabilities.
2. **Ingestion Worker**: Processes data from configured sources defined in `sources.yaml`.

Both components work independently but share the same MongoDB database.

### Component Separation Benefits

The separation of the API and worker components offers several advantages:

1. **Resource Isolation**
   - API remains responsive during resource-intensive ingestion processes
   - Prevents ingestion tasks from affecting API performance

2. **Independent Scaling**
   - Each component can be scaled based on its specific requirements
   - API scaling responds to HTTP traffic demands
   - Worker scaling adjusts to ingestion workload
   - Results in optimal resource utilization and cost efficiency

3. **Fault Isolation**
   - Failures in one component don't impact the other
   - Each component can be monitored and restarted independently
   - Increases overall system reliability

4. **Deployment Flexibility**
   - Components can be deployed to different environments
   - Workers can run on schedules or be triggered separately
   - Updates to one component don't require redeploying the other

5. **Development and Testing Advantages**
   - Independent development work on either component
   - Separate testing processes
   - Simplified local development environment

6. **Operational Benefits**
   - Clear separation of monitoring and logging
   - Distinct security policies per component
   - Better resource management
   - Simplified maintenance procedures

## Design Philosophy

### Canonical Fields Dictionary

The service employs a canonical-fields dictionary to standardize property data from diverse sources:

1. **Standardized Data Representation**
   - Maps varying source field names to consistent canonical fields
   - Example: `propertyName` → `name`, `listingId` → `id`

2. **Simplified Querying**
   - Consistent database schema enables efficient queries
   - Eliminates need for source-specific field handling

3. **Enhanced Maintainability**
   - New data sources require only configuration updates, not code changes

4. **Data Quality Control**
   - Data validation and transformation rules at mapping level
   - Ensures consistent quality across all sources

### Configuration-Oriented Approach

The system uses a configuration-driven architecture:

1. **Source Configuration**
   - Each data source defined in `sources.yaml`
   - Configuration includes:
     - S3 bucket and path information
     - Field mappings to canonical fields
     - Data transformation rules

2. **Flexible Ingestion**
   - Ingestion worker uses configuration to:
     - Locate source data
     - Map source fields to canonical fields
     - Apply necessary transformations

3. **Easy Source Addition**
   - New sources added by updating `sources.yaml`
   - No code changes required for basic field mapping
   - Only custom transformations might need code updates

4. **Business User Empowerment**
   - Non-technical users can manage data mappings
   - Business analysts can configure new sources using YAML
   - Domain experts can quickly update field mappings
   - Reduced dependency on development resources

This approach creates a highly adaptable system while maintaining a clean codebase and empowering business users.

## System Requirements

- Node.js (v18 or later)
- pnpm
- MongoDB
- AWS credentials (for S3 access - not needed when URLs are publicly accessible)

## Setup & Configuration

### Environment Variables

Create a `.env` file with the following variables:

```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017
MONGODB_DATABASE=properties
MONGODB_USERNAME=your_username
MONGODB_PASSWORD=your_password
MONGODB_AUTH_SOURCE=admin

# AWS Configuration
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
AWS_REGION=your_region
```

### Source Configuration

Create a `sources.yaml` file to configure your data sources:

```yaml
sources:
  source1:
    bucket: your-bucket
    bucketUrl: your-bucket/path/to/file.json
    mapping:
      id: id
      name: propertyName
      # ... other field mappings
```

## Installation & Operation

### Installation

```bash
pnpm install
```
### Running the local database

```bash
docker-compose up -d
```

### Running the API Server

```bash
pnpm start:api
```

The API will be available at `http://localhost:3000`

### Running the Ingestion Worker

```bash
pnpm start:worker
```

## API Reference

Swagger documentation is available at `http://localhost:3000/api`

### Available Endpoints

#### GET /properties

Query properties with filtering and pagination

### Query Parameters

- `city`: Filter by city
- `country`: Filter by country
- `isAvailable`: Filter by availability (true/false)
- `priceSegment`: Filter by price segment (low/medium/high)
- `minPrice`: Filter by minimum price
- `maxPrice`: Filter by maximum price
- `source`: Filter by data source
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)

### Response Format

```json
{
  "data": [...],
  "total": 100,
  "page": 1,
  "limit": 10,
  "totalPages": 10
}
```
