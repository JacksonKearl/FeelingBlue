# I'm Feeling Blue

Twitter verification for the rest of us.

## Installing the Extension

1. Download the latest release from [the releases page](https://github.com/JacksonKearl/FeelingBlue/releases). Note, only chromium (Chrome, Edge, etc.) is available at the moment. PR's welcome!
1. Unzip the folder, save it somewhere safe.
1. Follow [Official Instructions](https://developer.chrome.com/docs/extensions/mv3/getstarted/development-basics/#load-unpacked) for loading unpacked extensions.

## Questions

### Why isn't this in the extension stores? 

For your safety!

When installed from the stores, extensions can be updated at any time without your knowledge; when installed like this they can only be updated by you, which means you can verify the code! I recommend you do so - it's well less than 100 lines of natural JavaScript.

## Third party Licenses

### Stripe.js
The code used to verify webhook signatures was derived from stripe.js, with modifications by me to work in a Cloudflare worker context.
```md
MIT License

Copyright (c) 2017 Stripe

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### StackOverflow

- [Rimas Kudelis' emoji glyph parser](https://stackoverflow.com/a/68146409) (CC BY-SA 4.0)