package Lambda.sample;

import java.nio.ByteBuffer;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;

import org.json.JSONObject;

import com.amazonaws.regions.Region;
import com.amazonaws.regions.Regions;
import com.amazonaws.services.kinesis.AmazonKinesisClient;
import com.amazonaws.services.kinesis.model.PutRecordRequest;
import com.amazonaws.services.kinesis.model.PutRecordResult;
import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.SNSEvent;
import java.sql.PreparedStatement;

/**
 * Hello world!
 *
 */
public class SensorDataStreamer implements RequestHandler<SNSEvent, String> {

	public String handleRequest(SNSEvent event, Context context) {		
        
		for (SNSEvent.SNSRecord record : event.getRecords()) {
			
            SNSEvent.SNS sns = record.getSNS();
            
            String recordId = sns.getMessageAttributes().get("recordId").getValue();
            String locationId = sns.getMessageAttributes().get("locationId").getValue();
            String tableName = sns.getMessageAttributes().get("tableName").getValue();
            
            System.out.println("handleSNSEvent received SNS message " + recordId);
            System.out.println("handleSNSEvent received SNS message " + locationId);
            System.out.println("handleSNSEvent received SNS message " + tableName);
            
            Connection conn = null;
            PreparedStatement ps = null;
            ResultSet rs = null;                      
            
            // Load the Connector/J driver
            try {
            	Class.forName("com.mysql.jdbc.Driver").newInstance();
                // Establish connection to MySQL
                String url = "jdbc:mysql://mysql2.cf0nl4bnjdro.us-west-2.rds.amazonaws.com:3306/cmpe281";
                String user = "root";
                String password = "sreekar26";

                conn = DriverManager.getConnection(url, user, password);
                
                String sql = "SELECT * FROM user WHERE location=? AND status=?";
                
                ps = conn.prepareStatement(sql);
                
                ps.setString(1, locationId);
                ps.setString(2, "online");

                System.out.println(ps.toString());;

                rs = ps.executeQuery();

                if(rs.next())	{
                    conn.close();
                    rs.close();
                    ps.close();
                    rs = null;
                    ps = null;
                    conn = null;
                	
                	System.out.println("Fetching record " + recordId + " from table " + tableName);
                	
                	url = "jdbc:mysql://sensor-analytics.czxnhbn6esp2.us-west-2.rds.amazonaws.com:3333/sensor_analytics";
                    user = "root";
                    password = "!QAZ2wsx";
                    
                    conn = DriverManager.getConnection(url, user, password);
                                        
                    sql = "SELECT * FROM "+ tableName +" WHERE id=?";
                    
                    ps = conn.prepareStatement(sql);
                    
                    ps.setInt(1, Integer.parseInt(recordId));

                    System.out.println(ps.toString());;

                    rs = ps.executeQuery();
                    
                    if(rs.next())	{
                        
                        String timeStamp=rs.getString("timeStamp");
                        Float temperature = rs.getFloat("temperature");
                        Float carbonDiOxide=rs.getFloat("carbonDiOxide");
                        Float carbonMonOxide=rs.getFloat("carbonMonOxide");
                        Float nitrousOxide=rs.getFloat("nitrousOxide");
                        Float ozone=rs.getFloat("ozone");
                        int windDirection=rs.getInt("windDirection");
                        int windSpeed=rs.getInt("windSpeed");
                        Float humidity=rs.getFloat("humidity");
                        Float precipitation=rs.getFloat("precipitation");
                            
                        JSONObject data = new JSONObject();
                        data.put("timestamp", timeStamp);
                        data.put("temperature", temperature);
                        data.put("CO2", carbonDiOxide);
                        data.put("CO", carbonMonOxide);
                        data.put("NO", nitrousOxide);
                        data.put("O3",ozone);
                        data.put("humidity", humidity);
                        data.put("precipitation",precipitation);
                        data.put("windDirection",windDirection);
                        data.put("windSpeed",windSpeed );
                        
                        JSONObject kinRecord=new JSONObject();
                        kinRecord.put("detectedAnomaly","noanamoly" );
                        kinRecord.put("sensorName","combined");
                        kinRecord.put("series", tableName);
                        kinRecord.put("data", data);

                        System.out.println(kinRecord.toString());
                        
                        AmazonKinesisClient kinesis = new AmazonKinesisClient();
                		Region usWest2 = Region.getRegion(Regions.US_WEST_2);
                		kinesis.setRegion(usWest2);
                		
            			PutRecordRequest putRecordRequest = new PutRecordRequest();
            			putRecordRequest.setStreamName("clientStream");
            			
        				putRecordRequest.setData(ByteBuffer.wrap(kinRecord.toString().getBytes()));
        				putRecordRequest.setPartitionKey("partitionKey-shardId-000000000000");
        				PutRecordResult putRecordResult = kinesis.putRecord(putRecordRequest);

        				System.out.printf("Successfully put record, partition key : %s, ShardID : %s, SequenceNumber : %s.\n",
        						putRecordRequest.getPartitionKey(), putRecordResult.getShardId(),
        						putRecordResult.getSequenceNumber());
                    }
                    conn.close();
                    rs.close();
                    ps.close();
                    rs = null;
                    ps = null;
                    conn = null;
                    return "success";
                } 
                conn.close();
                rs.close();
                ps.close();
                rs = null;
                ps = null;
                conn = null;
			} catch (Exception e) {
				// TODO Auto-generated catch block
			System.out.println("Error in first exception");
				e.printStackTrace();
				try {
					if(conn != null )
	                conn.close();	
					if(rs!=null)					
					rs.close();
					if(ps!=null)
	                ps.close();
				} catch (SQLException e1) {
					System.out.println("Error in second exception");
					// TODO Auto-generated catch block
					e1.printStackTrace();
				}
			}
        }
        
        return "success";        
	}
	
/*	public static void main(String [] args)	{
        String url = "jdbc:mysql://mysql2.cf0nl4bnjdro.us-west-2.rds.amazonaws.com:3306/cmpe281";
        String user = "root";
        String password = "sreekar26";
        Connection conn = null;
        
        // Load the Connector/J driver
        try {
			Class.forName("com.mysql.jdbc.Driver").newInstance();
            // Establish connection to MySQL
            conn = DriverManager.getConnection(url, user, password);
            
            Statement stmt = conn.createStatement();
            String sql = "SELECT * FROM user WHERE location=? AND status=?";
            
            PreparedStatement ps = null;
            ResultSet rs = null;          
            
            ps = conn.prepareStatement(sql);
            
            ps.setString(1, "dr5regw90t4b");
            ps.setString(2, "online");

            System.out.println(ps.toString());;

            rs = ps.executeQuery();

            if(rs.next())	{
                rs.close();
                ps.close();
                conn.close();
            	
                System.out.println("Users are available");
            	
//            	System.out.println("Fetching record " + recordId + " from table " + tableName);
            	
            	url = "jdbc:mysql://sensor-analytics.czxnhbn6esp2.us-west-2.rds.amazonaws.com:3333/sensor_analytics";
                user = "root";
                password = "!QAZ2wsx";
                
                conn = DriverManager.getConnection(url, user, password);
                
                stmt = conn.createStatement();
                sql = "SELECT * FROM "+ "secondly" +" WHERE id=?";
                
                ps = conn.prepareStatement(sql);
                
                //ps.setString(1, "secondly");
                ps.setInt(1, Integer.parseInt("60527"));

                System.out.println(ps.toString());;

                rs = ps.executeQuery(); 
                if(rs.next())	{
                    System.out.println("Done");
                    
                    String timeStamp=rs.getString("timeStamp");
                    Float temperature = rs.getFloat("temperature");
                    Float carbonDiOxide=rs.getFloat("carbonDiOxide");
                    Float carbonMonOxide=rs.getFloat("carbonMonOxide");
                    Float nitrousOxide=rs.getFloat("nitrousOxide");
                    Float ozone=rs.getFloat("ozone");
                    int windDirection=rs.getInt("windDirection");
                    int windSpeed=rs.getInt("windSpeed");
                    Float humidity=rs.getFloat("humidity");
                    Float precipitation=rs.getFloat("precipitation");
                    
                    JSONObject data = new JSONObject();
                    data.put("timeStamp", timeStamp);
                    data.put("temperature", temperature);
                    data.put("CO2", carbonDiOxide);
                    data.put("CO", carbonMonOxide);
                    data.put("NO", nitrousOxide);
                    data.put("O3",ozone);
                    data.put("humidity", humidity);
                    data.put("precipitation",precipitation);
                    data.put("windDirection",windDirection);
                    data.put("windSpeed",windSpeed );
                    
                    JSONObject record=new JSONObject();
                    record.put("detectedAnomaly","noanamoly" );
                    record.put("sensorName","combined");
                    record.put("series", "secondly");
                    record.put("data", data);

                    System.out.println("timestamp: " +timeStamp);
                    System.out.println("temp: " + temperature);
                    System.out.println("co2: " + carbonDiOxide);
                    System.out.println("co: " + carbonMonOxide);
                    System.out.println("no: "+ nitrousOxide);
                    System.out.println("ozone: "+ ozone);
                    System.out.println("humidity: "+ humidity);
                    System.out.println("precip: "+ precipitation);
                    System.out.println(record.toString());

                }
            }            
		} catch (Exception e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}		
	}
*/
}
