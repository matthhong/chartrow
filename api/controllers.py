import sys
import jsonpickle
from server import app, login_manager, twitter
from api.models import *

from flask import render_template, redirect, request, g, jsonify, session
from flask_login import login_user, logout_user, current_user

@twitter.tokengetter
def get_twitter_token(token=None):
    return ('833666853520150528-be809NsQC77rNnHOLx7PBI0vQDYIgmo','oN8BGaILEEXRaQ1vjJxcE3906IK7Ho93UM1f02NAoPUom')

@app.route('/')
def index():
	return render_template('index.html')

@app.route('/api/get_tweets')
def get_tweets():
	home_timeline = twitter.get('statuses/home_timeline.json')
	return jsonify(success=True, results=jsonpickle.encode(home_timeline))

@login_manager.user_loader
def load_user(userID):
	return User.query.get(int(userID))


@app.before_request
def before_request():
	g.user = current_user

@app.route('/api/login', methods=['GET', 'POST'])
def login():
	pass

@app.route('/api/logout')
def logout():
	logout_user()
	return jsonify(success=True)



