from os import environ, makedirs
from os.path import expanduser, basename
import json
from urllib.parse import urlparse
import requests
from pyqrcode import QRCode
from io import BytesIO

DEFAULT_API_SERVER = environ.get(
    'NOTIFY_API_SERVER', 'https://notify.run/api/')
CONFIG_FILENAME = '~/.config/notify-run'


class NotConfigured(Exception):
    pass


class EndpointInfo:
    def __init__(self, info_dict):
        self.endpoint = info_dict['endpoint']
        self.channel_page = info_dict['channel_page']

    def _qr(self):
        return QRCode(self.channel_page, error='L')

    def _qr_svg(self):
        buffer = BytesIO()
        self._qr().svg(buffer, 6)
        return buffer.getvalue().decode('utf-8')

    def __repr__(self):
        return '''Endpoint: {}
To subscribe, open: {}
Or scan this QR code:
{}
        '''.format(
            self.endpoint,
            self.channel_page,
            self._qr().terminal(quiet_zone=1)
        )

    def _repr_html_(self):
        return '''<p>Endpoint: <samp>{0}</samp></p>
<p>To subscribe, open: <a href="{1}">{1}</a></p>
<p>Or scan this QR code:</p>
{2}
        '''.format(
            self.endpoint,
            self.channel_page,
            self._qr_svg()
        )


class Notify:
    def __init__(self, api_server=None, endpoint=None):
        self.api_server = api_server or DEFAULT_API_SERVER
        self.endpoint = None
        self._config_file = expanduser(CONFIG_FILENAME)

        self.read_config()

        if endpoint is not None:
            parse_result = urlparse(endpoint)
            if parse_result.scheme not in ['http', 'https']:
                raise ValueError('Endpoint should be a URL with an HTTP or HTTPS scheme (scheme was {}.)'.format(
                    parse_result.scheme))
            self.endpoint = endpoint

    # Config

    def read_config(self):
        self.config_file_exists = False
        try:
            with open(self._config_file, 'r') as conffile:
                self.config_file_exists = True
                config = json.load(conffile)
                self.endpoint = config['endpoint']
        except FileNotFoundError:
            return
        except json.decoder.JSONDecodeError:
            print('Invalid JSON in {}'.format(self._config_file))
            return

    def write_config(self):
        makedirs(basename(self._config_file), exist_ok=True)
        config = {
            'endpoint': self.endpoint,
        }
        try:
            with open(self._config_file, 'w') as conffile:
                json.dump(config, conffile)
        except Exception:
            raise

    # Commands

    def send(self, message):
        if self.endpoint is None:
            raise NotConfigured()
        requests.post(self.endpoint, message)

    def info(self):
        if self.endpoint is None:
            raise NotConfigured
        r = requests.get(self.endpoint + '/info').json()
        return EndpointInfo(r)

    def register(self):
        r = requests.post(self.api_server + 'register_channel').json()
        self.endpoint = r['endpoint']
        self.write_config()
        return EndpointInfo(r)
