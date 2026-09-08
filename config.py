import pymysql

def get_db_connection():
    #Conexion a base de datos
    return pymysql.connect(
        host='localhost',
        user='root',
        passwd='root123',
        database='studentflow_db',
        cursorclass=pymysql.cursors.DictCursor # Devuelve las filas como diccionarios de python (faciles de convertir a JSON)
    )
    