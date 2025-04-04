# YouTube Downloader

A modern web application that allows you to download YouTube videos and playlists using yt-dlp. The application provides two main features:

1. Download videos by entering a YouTube URL
2. Download videos from an RSS feed

## Features

- Download single videos by URL
- Download entire playlists
- Support for RSS feed downloads
- Modern, responsive UI
- Multiple format options
- Easy to use interface

## Prerequisites

- Node.js (v20 or higher)
- npm or yarn
- Python 3.7 or higher (for yt-dlp)
- yt-dlp installed on your system

## Installation

1. Clone the repository:

```bash
git clone https://github.com/jopoepl/yt-downloader.git



cd yt-dlp-downloader
```

2. Install Python dependencies:

```bash
pip install yt-dlp
```

3. Install Node.js dependencies:

```bash
npm install
# or
yarn install
```

## Usage

1. Start the development server:

```bash
npm run dev
# or
yarn dev
```

2. Open your browser and navigate to `http://localhost:3000`

3. Choose your download method:
   - **URL Download**: Enter a YouTube URL and select your preferred format
   - **RSS Feed**: Enter an RSS feed URL to download multiple videos

## Building for Production

To create a production build:

```bash
npm run build
# or
yarn build
```

To start the production server:

```bash
npm run start
# or
yarn start
```

## Project Structure

```
yt-dlp-downloader/
├── app/                 # Next.js app directory
│   ├── api/            # API routes
│   ├── components/     # React components
│   └── page.tsx        # Main page component
├── public/             # Static files
└── package.json        # Project dependencies
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the [MIT License](LICENSE).

## Acknowledgments

- [yt-dlp](https://github.com/yt-dlp/yt-dlp) - The core download engine
- [Next.js](https://nextjs.org/) - The React framework used
- [React](https://reactjs.org/) - The JavaScript library used
