from flask import Flask, jsonify, request, render_template
from flask_cors import CORS
from config import get_db_connection

app = Flask(__name__)
CORS(app)  # 2. Le decimos a Flask que permita peticiones desde cualquier origen (CORS libre)

@app.route('/')
def home():
    return render_template('index.html')

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
    
# ------------------------------------------------
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
    
# ------------------------------------------------
# ENDPOINT 3: Eliminar una nota por su ID (DELETE)
# ------------------------------------------------
@app.route('/api/notas/<int:id>', methods=['DELETE'])
def eliminar_nota(id):
    try:
        conexion = get_db_connection()
        cursor = conexion.cursor()
        
        # 1. Ejecutamos la orden DELETE buscando por el ID que viene en la URL
        sql = "DELETE FROM notas WHERE id = %s"
        cursor.execute(sql, (id,))
        
        # 2. Importante: Cambiar el cambio en MySQL
        conexion.commit()
        
        # 3. Conocer cuantas filas se borraron con rowcount
        filas_afectadas = cursor.rowcount
        
        conexion.close()
        
        # Si el rowcount es 0, significa que el ID no existia en la base de datos
        if filas_afectadas == 0:
            return jsonify({"error": f"No se encontro ninguna nota con el ID {id}"}), 404 # 404 = Not Found
        
        return jsonify({"mensaje": f"Nota {id} eliminada con exito"}), 200
    
    except Exception as e:
        return jsonify({"error": f"Error al eliminar nota: {str(e)}"}), 500
    
if __name__== '__main__':
    app.run(debug=True, port=5000)