from flask import Flask, jsonify, request
from config import get_db_connection

app = Flask(__name__)

@app.route('/')
def home():
    return "<h1> Servidor StudenFlow Activo</h1>"

# -----------------------------------------------
# ENDPOINT 1: Otener todas las notas (GET)
# ------------------------------------------------
@app.route('/api/notas', methods=['GET'])
def obtener_notas():
    try:
        conexion = get_db_connection()
        cursor = conexion.cursor()
        
        # 1. Ejecytamos la consulta SQL ordenado por la fecha mas reciente
        
        cursor.execute("SELECT * FROM notas ORDER BY fecha_creacion DESC")
        
        # 2. fetchall() trae TODAS las filas encontradas como una lista de diccionarios
        notas = cursor.fetchall()
        
        conexion.close()
        
        # 3. jsonify() convierte la lista de Python a formato JSON
        return jsonify(notas), 200 # 200 = ok
    
    except Exception as e:
        return jsonify({"error": f"Error en el servidor: {str(e)}"}), 500
    
# -----------------------------------------------
# ENDPOINT 2: Crear una nueva nota (POST)
# ------------------------------------------------
@app.route('/api/notas', methods=['POST'])
def crear_nota():
    try:
        # 1. Obtenemos los datos que nos envia el cliente en formato JSON
        datos = request.get_json()
        
        titulo = datos.get('titulo')
        contenido = datos.get('contenido', '') # Si no envian contenido, queda como texto vacio ''
        
        # 2. Validacion basica
        if not titulo:
            return jsonify({"error": "El titulo de la nota es obligatorio"}), 400 # 400 = Bad Request
        
        conexion = get_db_connection()
        cursor = conexion.cursor()
        
        # 3. Consulta SQL usando los marcadores %s (Seguridad)
        sql = "INSERT INTO notas (titulo, contenido) VALUES (%s, %s)"
        cursor.execute(sql, (titulo, contenido))
        
        # 4. IMPORTANTE! Guardar cambios permanentemente
        conexion.commit()
        
        # 5. Obtenemos el ID que MySQL le asigno automaticamente a esta nota
        nuevo_id = cursor.lastrowid

        conexion.close()
        
        return jsonify({
            "mensaje": "Nota creada con exito",
            "id": nuevo_id,
            "titulo": titulo
        }), 201 # 201 = Created (Cra=eado con exito)
        
    except Exception as e:
        return jsonify({"error": f"Error al crear nota: {str(e)}"}), 500
    
if __name__== '__main__':
    app.run(debug=True, port=5000)
    