#iMerge

##Inspiration
iMerge is greatly inspired by the work ZAP, Zapped Artificial Picture, by [apfab](http://apfab.com/), a.k.a. Albert Westerhoff and Fabian de Boer, from 2006. Their version being written in PHP, I wanted to create a version in Node.js to see if this was both possible and if so, if it would be shorter in amount of lines of code.

What fascinated me in ZAP was the fact that the application actually creates the images, without human intervention. Or at least, ZAP originally requests user input before it starts out merging images. I wanted to have the human decoupled from the concept: __I want the internet to autonomously create new images.__ I did this also with [ax710](http://www.ax710.org) in [Maleglitch](http://www.maleglitch.net) and see this as a core feature of my artistic work: to only create blueprints and not to create images myself. I don't want to choose what an image should look like. I only want to create an outline and let the internet create the real images.

##Concept

This app merges images retrieved via Google into a new image. In this case, images from artists, because it used the [ars.y-a-v-a.org](http://ars.y-a-v-a.org) API to retrieve random artist names. This app is a blue print. It does nothing more than creating the outlines for a process. All resulting images are (probably) unique. They are made by the internet, on the internet, they have no copyrights, as a non-human created the image. Compare the [macaque](http://commons.wikimedia.org/wiki/File:Macaca_nigra_self-portrait_large.jpg#Licensing) case. The code of the app is licensed under MIT, but, let me repeat, the resulting images are the product of a creative process fulfilled by the internet. The resulting images are in the _public domain_.

Artist names used in this app are randomly taken from an artist name api called [ars](http://ars.y-a-v-a.org/). Then Google Images is requested to find images with this name. When we have a result, three images are picked and combined together into a new image.

##For the curious

The [node-gd](https://github.com/y-a-v-a/node-gd) package, using libgd2 is used, as it was used in the PHP version of ZAP also, and because, as far as I could see, it was the better image processing package in NPM. I store the results in public/images and return an existing imags in more or less 2 outof 3 requests so save a bit of CPU usage. Also, I cache the Google CSE (Custom Search Engine) JSON result to limit the cost, since this service unfortunately isn't free.

##Contributors
 - [Vincent Bruijn](https://github.com/y-a-v-a)

## License

[MIT](LICENSE)
