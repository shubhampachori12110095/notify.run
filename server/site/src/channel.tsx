import * as React from 'react';

import { NotifyAPI, Message, ChannelResponse } from './api';
import { SubscriptionManager } from './subscription';
import { Config } from './config';


interface MessageListProps {
    messages: Message[],
}

class MessageList extends React.Component<MessageListProps, {}> {
    render() {
        if (this.props.messages.length == 0) {
            return <div><em>Messages to this channel will appear here.</em></div>;
        }

        return <div className="ui segment">
            <div className="ui feed">
                {
                    this.props.messages.map((message: Message, i: number) =>
                        <div className="event" key={i}>
                            <div className="content">
                                <div className="summary">
                                    <samp>{message.message}</samp>
                                    <div className="date">{message.time}</div>
                                </div>
                            </div>
                        </div>)
                }
            </div></div>;
    }
}

interface ChannelPageProps {
    channelId: string,
}

interface ChannelPageState {
    messages: Message[],
    loading: boolean,
    subscribed: boolean,
}

export class ChannelPage extends React.Component<ChannelPageProps, ChannelPageState> {
    subscriptionManager: SubscriptionManager;

    constructor(props: any) {
        super(props);

        this.state = {
            messages: [],
            loading: true,
            subscribed: false,
        };
    }

    loadChannel() {
        NotifyAPI.fetchChannel(this.props.channelId).then((response) => {
            this.subscriptionManager = new SubscriptionManager(response.pubKey);
            this.subscriptionManager.getSubscription().then((k) => {
                let subscribed = (response.subscriptions.indexOf(k.id) >= 0);
                this.setState({
                    subscribed: subscribed,
                });
            });

            this.setState({
                messages: response.messages || [],
                loading: false,
            });
        })
    }

    componentDidMount() {
        document.title = `channel ${this.props.channelId}`;

        this.loadChannel();

        setInterval(this.loadChannel.bind(this), 30 * 1000);
    }

    onSubscribe() {
        this.subscriptionManager.subscribe(this.props.channelId).then(() => {
            this.setState({
                subscribed: true,
            })
        }).catch((e: Error) => {
            console.log(e);
        });
    }

    render() {
        if (this.state.loading) {
            return <div className="ui active centered inline loader"></div>;
        }

        let channelEndpoint = `${Config.API_SERVER}/${this.props.channelId}`
        let webLink = `${Config.WEB_SERVER}/c/${this.props.channelId}`;
        return <div>
            <h2>Channel <samp>{this.props.channelId}</samp></h2>
            <h3>Recent messages</h3>
            <MessageList messages={this.state.messages} />

            <h3>Send Messages</h3>
            <p>To send the channel a message, run this command:</p>

            <pre>curl {channelEndpoint} -d "message goes here"</pre>


            <h3>Add Subscription</h3>

            <p>Subscribe on this device using the button below.</p>
            <p>{
                this.state.subscribed ?
                    <button
                        className="ui disabled button">Already Subscribed</button> :
                    <button onClick={this.onSubscribe.bind(this)}
                        className="ui primary button">Subscribe on this device</button>
            }
            </p>
            <p>Subscribe on another device by opening <a href={webLink}>{webLink}</a> or scanning the QR code below.</p>

            <embed type="image/svg+xml" src={NotifyAPI.getURLOfQR(this.props.channelId)} />


        </div>
    }
}
