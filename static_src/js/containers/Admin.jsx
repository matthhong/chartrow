import React from 'react';
import {GridList, GridTile} from 'material-ui/GridList';
import RaisedButton from 'material-ui/RaisedButton'
import Checkbox from 'material-ui/Checkbox';
import Feed from './RSSFeed';
import ReactCrop from 'react-image-crop'
import ReactModal from 'react-modal'
import axios from 'axios'
import TweetFeed from './TweetFeed'

import 'react-image-crop/dist/ReactCrop.css';

const style= {
	td: {
		home: {
			width: '50%'
		},
		modal: {
			textAlign: 'center'
		}
	}
}

export default class Admin extends React.Component {
	constructor() {
		super()
		this.state= {
			tweets: [],
			imageLinks: [],
			cropImage: '',
			cropRatio: {
				x: 0,
				y: 0,
				width: 0,
				height: 0
			},
			cropPixels: {
				x: 0,
				y: 0,
				width: 0,
				height: 0
			},
			linkUrl: 'https://www.nytimes.com/interactive/2017/02/27/us/politics/most-important-problem-gallup-polling-question.html',
			openModal: false,
			lead: false
		}
		this.updateTweets = this.updateTweets.bind(this)
		this.promoteLink = this.promoteLink.bind(this)
	}
	componentDidMount() {
		var socket = io.connect('http://' + document.domain + ':' + location.port);
        socket.on('connect', function() {
            socket.emit('connected', {data: 'I\'m connected!'});
        });
        socket.on('tweet', this.updateTweets)
        this.getImages(this.state.linkUrl)
	}
	updateTweets(data) {
		const tweet = JSON.parse(data)
		this.setState({
			tweets: Array.concat(this.state.tweets, JSON.parse(data))
		})
	}
	getImages(link) {
		this.setState({
			imageLinks: [],
			linkUrl: link
		})
		axios
			.get('/api/get_images?link='+encodeURIComponent(link))
			.then((response) => {
				this.setState({
					imageLinks: response.data.results
				})
			})
	}
	setCropImage(src) {
		this.setState({
			openModal: true,
			cropImage: src
		})
	}
	setCropSize(crop, pixelCrop) {
		this.setState({
			cropRatio: crop,
			cropPixels: pixelCrop
		})
	}
	promoteLink(){
		axios
			.post('/api/promote', {
				url: this.state.linkUrl,
				imgSrc: this.state.cropImage,
				cropPixels: this.state.cropPixels,
				lead: this.state.lead
			})
			.then((response) => {
				this.setState({
					alert: 'Success!'
				})
			})
			.catch((e) => {
				this.setState({
					alert: e
				})
			})
	}
	deleteLink(){
		axios
			.post('/api/delete', {
				url: this.state.linkUrl
			})
			.then((response) => {
				this.setState({
					alert: 'Success!'
				})
			})
			.catch((e) => {
				this.setState({
					alert: e
				})
			})
	}
	render() {
		return (
			<div style={{textAlign:'center'}}>
			<ReactModal isOpen={this.state.openModal} contentLabel="cropImage">
				<table>
					<tbody>
						<tr>
							<td>
								<ReactCrop 
								src={this.state.cropImage} 
								onComplete={this.setCropSize.bind(this)}
								/>
							</td>
							<td>
								<div>
									
									<Checkbox
								      label="Lead article"
								      checked={this.state.lead}
								      onCheck={(event, checked) => {
								      	this.setState({
								      		lead: checked
								      	})
								      }}
								    />
								
								
									<RaisedButton
										label="Promote"
										onClick={this.promoteLink}></RaisedButton>
									<RaisedButton
										label="Delete"
										onClick={this.deleteLink.bind(this)}></RaisedButton>
									<br/><br/><br/><br/>
								
									<RaisedButton
									label="Close"
									onClick={() => {
										this.setState({
											openModal: false
										})
									}}></RaisedButton>
								
								</div>
								
							</td>
						</tr>
					</tbody>
				</table>
			</ReactModal>
			<table style={{display:'inline-table', width:1200}}>
				<tbody>
					<tr>
						<td style={style.td.home} rowSpan="2">
							<TweetFeed 
								tweets={this.state.tweets}
								onSurf={this.getImages.bind(this)}></TweetFeed>
						</td>
						<td style={style.td.home}>
						<GridList>
							{ 
								this.state.imageLinks.map((link, k)=>(
									<GridTile key={k} >
										<img src={link} onClick={(e) => this.setCropImage(e.target.src)} />
									</GridTile>	
								))
							}
        				</GridList>
        				</td>
					</tr>
				</tbody>
			</table>
			</div>
			)
	}
}