We plan to provide cloud based server-less sensor data processing system which can combine the data from different data sources and average seconds data into minutely and hourly. By Server-less processing system, data processing happens when ever the data is available instead of designing a separate server logic. This system will also provide a dashboard which can be used for analyzing data at real time
  This application provides the following services/operations: 
    Users can create an account for this portal to manage and view dashboards for the subscribed locations.
    Users can subscribe to a particular location to receive weather-based information about that location. The app will ask a user to subscribe to a location from a list of locations to view dashboards and data pertaining to weather conditions in that location.
    A user who has an account can login and view dashboards for the locations he/she has subscribed to.
    The app will support user credential verification.
    Users can receive a real-time feed of the following weather metrics: temperature, precipitation, humidity and wind velocity.
    Users can get an aggregated view of the weather-based data to get an overall analysis for the subscribed location.
    The app will provide anomaly detection services for meteorological disasters for a subscribed location.
It uses following AWS components:
Amazon Elastic Cloud Compute (EC2) is used as Virtual Sensor Data Generator. Java Process will be deployed on this application to read static data from database and push it to Kinesis Backend.
Amazon Kinesis is a message streaming service. In our project kinesis is used as Kinesis Backend and Kinesis Frontend. Kinesis Backend collect data from Data Sources and notify data processing Lambda for further processing. Kinesis Frontend is client facing, data streaming lambda produces data to kinesis and client dashboards consumes data for further analytics.
Amazon Lambda functions are the main components of our architecture. They provide server less computing platform for our application. There are 2 lambda functions in our design. Data processing lambda that is responsible for aggregating and segregation of geo location data and also maps between geo location and columnar data.
Amazon Dynamodb is responsible for storing sensors location data. Users can query based on location and, it also contains foreign keys to Redshift database which contains aggregated data.
Amazon Relational Data Sotre is responsible for storing sensors data. Temperature data, humidity data and data like precipitation is stored in Dynamodb. It aggregates and stores data for Secondly, Minutely and hourly reports
Amazon Relational Data Store (RDS) is responsible for storing user credentials.
