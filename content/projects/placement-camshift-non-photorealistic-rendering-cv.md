---
# This project only displays on the CV. It is split into multiple files with individual Nuffield
# placement projects for display on the website. You can find those in the
# `placement-camshift-web.md` and `placement-non-photorealistic-rendering-web.md` files. Please
# ensure that these files are kept in sync.
title: CAMSHIFT and Non-Photorealistic Rendering
startDate: 2014-05-01
endDate: 2014-07-01
ongoing: false

links:
  - link: https://github.com/davidtwco/nuffield-computer-vision
    text: View Source

type: Nuffield Placement at Glasgow Caledonian University
typeColour: sunflower

category:
  name: Education
  key: education
location:
  company: Glasgow Calidonian University
  city: Glasgow, Scotland

cv:
  jobTitle: Nuffield Foundation Placement

hideOnWeb: true
hideOnCV: false

tags:
  - C++
  - OpenCV
  - Eclipse
  - Visual Studio
---
During 2014, on a summer placement at Glasgow Caledonian University, I implemented a colour-based tracking algorithm from a research paper in C++ with OpenCV. The implementation was capable of full 360 tracking of multiple objects simultaneously even when the object leaves and re-enters the frame.

Further, I also implemented a program that uses the process of Non-Photorealistic Rendering to make an image look less realistic - in essence, creating a cartoon out of an image. This made use of the excellent [OpenCV](http://opencv.org/) and involved two distinct stages - extracting the edges from the image and overlaying them on a copy of the original image that uses a reduced set of colours.
