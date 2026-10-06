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
        notas = cursor.fetchall()
        
        # Obtener checklist items para cada nota
        for nota in notas:
            cursor.execute("SELECT id, texto, completado FROM checklist_items WHERE nota_id = %s ORDER BY id ASC", (nota['id'],))
            nota['checklist'] = cursor.fetchall()
        
        conexion.close()
        return jsonify(notas), 200
    
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
            "titulo": titulo,
            "contenido": contenido,
            "fecha_creacion": None,
            "checklist": []
        }), 201
        
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

    
# -------------------------------------------------------------
# ENDPOINT 4: Obtener todos los eventos (GET)
# -------------------------------------------------------------
@app.route('/api/eventos', methods=['GET'])
def obtener_eventos():
    try:
        conexion = get_db_connection()
        cursor = conexion.cursor()
        # Traemos la fecha formateada en YYYY-MM-DD
        cursor.execute("SELECT id, titulo, descripcion, DATE_FORMAT(fecha_evento, '%Y-%m-%d') as fecha_evento, color FROM eventos ORDER BY fecha_evento ASC")
        eventos = cursor.fetchall()
        conexion.close()
        return jsonify(eventos), 200
    except Exception as e:
        return jsonify({"error": f"Error al obtener eventos: {str(e)}"}), 500

# -------------------------------------------------------------
# ENDPOINT 5: Crear un evento (POST)
# -------------------------------------------------------------
@app.route('/api/eventos', methods=['POST'])
def crear_evento():
    try:
        datos = request.get_json()
        titulo = datos.get('titulo')
        fecha_evento = datos.get('fecha_evento')

        if not titulo or not fecha_evento:
            return jsonify({"error": "Título y fecha son obligatorios"}), 400

        conexion = get_db_connection()
        cursor = conexion.cursor()
        sql = "INSERT INTO eventos (titulo, fecha_evento) VALUES (%s, %s)"
        cursor.execute(sql, (titulo, fecha_evento))
        conexion.commit()
        nuevo_id = cursor.lastrowid
        conexion.close()

        return jsonify({"mensaje": "Evento creado con éxito", "id": nuevo_id}), 201
    except Exception as e:
        return jsonify({"error": f"Error al crear evento: {str(e)}"}), 500

# -------------------------------------------------------------
# ENDPOINT 6: Eliminar un evento (DELETE)
# -------------------------------------------------------------
@app.route('/api/eventos/<int:id>', methods=['DELETE'])
def eliminar_evento(id):
    try:
        conexion = get_db_connection()
        cursor = conexion.cursor()
        cursor.execute("DELETE FROM eventos WHERE id = %s", (id,))
        conexion.commit()
        conexion.close()
        return jsonify({"mensaje": f"Evento {id} eliminado con éxito"}), 200
    except Exception as e:
        return jsonify({"error": f"Error al eliminar evento: {str(e)}"}), 500


# -------------------------------------------------------------
# ENDPOINTS CHECKLIST
# -------------------------------------------------------------
# POST /api/notas/<id>/items - Agregar item a checklist de una nota
@app.route('/api/notas/<int:nota_id>/items', methods=['POST'])
def agregar_checklist_item(nota_id):
    try:
        datos = request.get_json()
        texto = datos.get('texto', '').strip()
        
        if not texto:
            return jsonify({"error": "El texto del item es obligatorio"}), 400
        
        conexion = get_db_connection()
        cursor = conexion.cursor()
        
        # Verificar que la nota existe
        cursor.execute("SELECT id FROM notas WHERE id = %s", (nota_id,))
        if not cursor.fetchone():
            conexion.close()
            return jsonify({"error": "Nota no encontrada"}), 404
        
        sql = "INSERT INTO checklist_items (nota_id, texto, completado) VALUES (%s, %s, 0)"
        cursor.execute(sql, (nota_id, texto))
        conexion.commit()
        nuevo_id = cursor.lastrowid
        conexion.close()
        
        return jsonify({
            "mensaje": "Item agregado",
            "id": nuevo_id,
            "texto": texto,
            "completado": 0
        }), 201
    except Exception as e:
        return jsonify({"error": f"Error al agregar item: {str(e)}"}), 500


# PUT /api/items/<id>/toggle - Cambiar estado completado
@app.route('/api/items/<int:id>/toggle', methods=['PUT'])
def toggle_checklist_item(id):
    try:
        conexion = get_db_connection()
        cursor = conexion.cursor()
        
        # Obtener estado actual
        cursor.execute("SELECT completado FROM checklist_items WHERE id = %s", (id,))
        item = cursor.fetchone()
        
        if not item:
            conexion.close()
            return jsonify({"error": "Item no encontrado"}), 404
        
        nuevo_estado = 0 if item['completado'] else 1
        cursor.execute("UPDATE checklist_items SET completado = %s WHERE id = %s", (nuevo_estado, id))
        conexion.commit()
        conexion.close()
        
        return jsonify({"mensaje": "Estado actualizado", "completado": nuevo_estado}), 200
    except Exception as e:
        return jsonify({"error": f"Error al actualizar item: {str(e)}"}), 500


# DELETE /api/items/<id> - Eliminar item
@app.route('/api/items/<int:id>', methods=['DELETE'])
def eliminar_checklist_item(id):
    try:
        conexion = get_db_connection()
        cursor = conexion.cursor()
        cursor.execute("DELETE FROM checklist_items WHERE id = %s", (id,))
        conexion.commit()
        filas = cursor.rowcount
        conexion.close()
        
        if filas == 0:
            return jsonify({"error": "Item no encontrado"}), 404
        
        return jsonify({"mensaje": "Item eliminado"}), 200
    except Exception as e:
        return jsonify({"error": f"Error al eliminar item: {str(e)}"}), 500


# GET /api/notas/<id>/items - Obtener items de checklist de una nota
@app.route('/api/notas/<int:nota_id>/items', methods=['GET'])
def obtener_checklist_items(nota_id):
    try:
        conexion = get_db_connection()
        cursor = conexion.cursor()
        cursor.execute("SELECT id, texto, completado FROM checklist_items WHERE nota_id = %s ORDER BY id ASC", (nota_id,))
        items = cursor.fetchall()
        conexion.close()
        return jsonify(items), 200
    except Exception as e:
        return jsonify({"error": f"Error al obtener items: {str(e)}"}), 500
     
if __name__== '__main__':
    app.run(debug=True, port=5000)