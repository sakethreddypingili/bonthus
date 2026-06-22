import os
import sys
import psycopg2

def run():
    password = "BnLzLMeVg2Hd5EEW"
    project_ref = "dnjarwvhyqyjxunelexs"
    
    conn_str = f"host=aws-1-ap-south-1.pooler.supabase.com port=5432 user=postgres.{project_ref} password={password} dbname=postgres sslmode=require"
    
    try:
        conn = psycopg2.connect(conn_str)
        cursor = conn.cursor()
        cursor.execute("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'prescriptions'
            ORDER BY ordinal_position;
        """)
        columns = cursor.fetchall()
        print("Columns in prescriptions table:")
        for col in columns:
            print(f"  {col[0]}: {col[1]}")
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    run()
