from flask import Flask
from config import get_db_connection

# Iniciamos la aplicacion de flask
app = Flask(__name__)

# Definimos la ruta principal ("/")
@app.route('/')
def home():
    try:
        # Conectamos a la base de datos
        conexion = get_db_connection()
        conexion.close() # Cerramos la conexion para no dejarla abierta
        
        return "<h1> Servidor corriendo y conextado a Flask con exito</h1><p>Bienvenido a StudentFlow</p>"
    except Exception as e:
        return f"<h1> Error al conectar con MySQL:</h1><p>{e}</p>"

# Arrancamos el servidor en modo desarrollo   
if __name__== '__main__':
    app.run(debug=True, port=5000)