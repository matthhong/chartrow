import sys
import jsonpickle
import json
import urllib
import urllib.request
import urllib.parse
from datetime import datetime
from application import application, twitter, socketio
from api.models import *

from flask import render_template, redirect, request, g, jsonify, session, Response
from flask_socketio import emit

from tweepy.streaming import StreamListener
from tweepy import Stream, TweepError, API

from bs4 import BeautifulSoup
from PIL import Image

user_agent = 'Mozilla/5.0 (Windows; U; Windows NT 5.1; en-US; rv:1.9.0.7) Gecko/2009021910 Firefox/3.0.7'
accept = 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'

def transform_data(data):
	urls = data.entities['urls']
	to_emit = {}
	if len(urls) > 0 and len(urls[0]['expanded_url']) > 0:
		txt = data.text
		spl = txt.split()
		links = [s for s in spl if s.startswith('http')]
		for l in links:
			txt = txt.replace(l, '')

		to_emit = {
			'url': urls[0]['expanded_url'],
			'text': txt,
			'timestamp_ms': data.created_at.timestamp(),
			'user_name': data.user.name,
			'screen_name': data.user.screen_name,
			'tweet': 'https://twitter.com/%s/status/%s'%(data.user.screen_name, data.id_str)
		}
		print('Success')
	else:
		print('Failure')
	return to_emit


class TweetListener(StreamListener):
	def on_status(self, data):
		# import pprint; pprint.pprint(data.entities)
		# data = json.loads(data)
		to_emit = transform_data(data)
		emit('tweet', to_emit, broadcast=True)
		return True

	def on_error(self, status):
		print(status)


listener = TweetListener()
stream = Stream(twitter, listener)
api = API(twitter)

@socketio.on('connect')
def stream_tweets():
	try:
		print('Client connected')
		return Response(stream.userstream(), content_type='text/event-stream')
	except TweepError:
		return jsonify(success=True)
	except:
		return jsonify(success=False)


@socketio.on('disconnect')
def disconnect():
	print('Client disconnected')
	return

@application.route('/')
def index():
	return render_template('index.html')

@application.route('/api/tweets')
def tweets():
	tweets = api.home_timeline(count=request.args.get('count'))
	# import pdb; pdb.set_trace()
	return jsonify(success=True, results=[transform_data(tweet) for tweet in tweets])

@application.route('/api/get_images')
def get_images():
	url = urllib.parse.unquote(request.args.get('link'))
	# import pdb; pdb.set_trace()
	opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor())
	opener.addheaders = [
		('User-Agent', user_agent),
		('Accept', accept)
	]
	r = opener.open(url).read()

	soup = BeautifulSoup(r, "html.parser")
	meta_tags = soup.select('meta[property*="image"],meta[name*="image"]')
	meta_content = [urllib.parse.urljoin(url, link['content']) for link in meta_tags if link.has_attr('content')]
	images = soup.select('img')
	img_links = [urllib.parse.urljoin(url, link['src']) for link in images if link.has_attr('src')]
	return jsonify(results=meta_content+img_links, success=True)


@application.route('/api/promote', methods=['POST'])
def promote():
	incoming = request.get_json()
	lead = incoming['lead']
	url = incoming['url']
	title = incoming['title']
	tag_query = incoming['tag']
	real_date = datetime.fromtimestamp(incoming['realTimestamp']/1000.0).isoformat()
	if db.session.query(Link).filter_by(url=url).count() < 1:
		tag = Tag.query.filter_by(name=tag_query).first()
		if not tag:
			tag = Tag(tag_query)
		link = Link(url, title, lead, real_date)
		tag.links.append(link)
		db.session.add(link)
		db.session.add(tag)
		db.session.commit()

		crop_size = incoming['cropPixels']
		if len(incoming['imgSrc']) and int(crop_size['width']):
			size_spec = [crop_size['x'], crop_size['y'], crop_size['width'], crop_size['height']]
			size_ratio = crop_size['height']/crop_size['width']
			read_image = urllib.request.urlopen(incoming['imgSrc'])
			im = Image.open(read_image)
			cropped = im.crop(tuple([int(spec) for spec in size_spec]))

			if lead:
				large = cropped.resize((400,int(400*size_ratio)), Image.ANTIALIAS)
				img_src = '%r-400.png' % link.id
				abs_src = '%s_src/images/%s' % (application.static_folder, img_src)
				large.save(abs_src, quality=95)
			
			small = cropped.resize((70,int(70*size_ratio)), Image.ANTIALIAS)
			img_src = '%r.png' % link.id
			abs_src = '%s_src/images/%s' % (application.static_folder, img_src)
			small.save(abs_src, quality=95)
			
			db.session.add(link)
			db.session.commit()

		return jsonify(success=True)
	return jsonify(success=False)

@application.route('/api/tags')
def tags():
	tags = Tag.query.all()
	return jsonify(success=True, results=[tag.name for tag in tags])

@application.route('/api/delete', methods=['POST'])
def delete():
	incoming = request.get_json()
	url = incoming['url']
	query = db.session.query(Link).filter_by(url=url)
	if query.count() > 0:
		query.delete()
		db.session.commit()
		return jsonify(success=True)
	return jsonify(success=False), 403

@application.route('/api/get_links')
def get_links():
	links = Link.query.limit(20).all()
	return jsonify(success=False, results=[link.serialize for link in links])

@application.route('/api/login', methods=['GET', 'POST'])
def login():
	pass

@application.route('/api/logout')
def logout():
	logout_user()
	return jsonify(success=True)



