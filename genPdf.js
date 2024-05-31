const PDFDocument = require('pdfkit');
const fs = require('fs');
const axios = require('axios');

async function generatePDF(data, outputPath) {
    return new Promise(async (resolve, reject) => {
        const doc = new PDFDocument({
            size: 'A4', // Standard A4 size
            margins: { top: 50, bottom: 50, left: 50, right: 50 } // Set margins
        });
        const writeStream = fs.createWriteStream(outputPath);
        doc.pipe(writeStream);

        const verticalOffset = -180; // Adjust this value to move content higher or lower

        let firstPage = true;

        for (const chapter of data.chapters) {
            if (!firstPage) {
                doc.addPage();
            } else {
                firstPage = false;
            }

            const pageWidth = doc.page.width;
            const pageHeight = doc.page.height;
            const margin = 50;
            const columnGap = 5; // Gap between content and image columns

            const columnWidth = (pageWidth - 2 * margin - columnGap) / 2;

            // Title and Summary
            doc.fontSize(20);
            const titleHeight = doc.heightOfString(chapter.title, { width: columnWidth });
            const summaryHeight = doc.fontSize(12).heightOfString(chapter.summary, { width: columnWidth });

            const contentHeight = titleHeight + summaryHeight + 30; // Additional space for padding
            const remainingHeight = pageHeight - contentHeight - 2 * margin;

            // Centering the text vertically with an offset
            const titleY = margin + remainingHeight / 2 + verticalOffset;

            // Content Column
            doc.fontSize(21)
               .text(chapter.title, margin, titleY, { width: columnWidth, align: 'center', underline: true })
               .moveDown(0.5);

            doc.fontSize(14)
               .text(chapter.summary, { width: columnWidth, align: 'center' })
               .moveDown(1);

            // Image Column
            if (chapter.image) {
                let retries = 3;
                while (retries > 0) {
                    try {
                        const response = await axios.get(chapter.image, { responseType: 'arraybuffer' });
                        const imgBuffer = Buffer.from(response.data, 'binary');
                        
                        const imageX = margin + columnWidth + columnGap;
                        const imageY = titleY;
                        const imageWidth = columnWidth;
                        const imageHeight = remainingHeight; // Adjust image height to fit remaining space
                        
                        doc.image(imgBuffer, imageX, imageY, { fit: [imageWidth, imageHeight] })
                           .moveDown(1);
                        
                        break; // Exit the loop if successful
                    } catch (error) {
                        console.error('Error fetching image:', error);
                        retries--; // Decrement the retry count
                        if (retries === 0) {
                            reject(error); // Reject if retries are exhausted
                            return; // Exit the function
                        }
                        console.log(`Retrying... Attempts left: ${retries}`);
                    }
                }
            }
        }

        doc.end();

        writeStream.on('finish', () => {
            resolve();
        });

        writeStream.on('error', (error) => {
            reject(error);
        });
    });
}

const data = {
    chapters: [
        {
            title: 'Chapter 1',
            summary: 'This is a summary of chapter 1.',
            image: 'https://assets-global.website-files.com/60dc0d5ebba157172984b158/65e155ac225e1e5897058f0e_WhatsApp%20Image%202024-02-23%20at%2016.29.01.jpeg'
        },
        {
            title: 'Chapter 2',
            summary: 'This is a summary of chapter 2.',
            image: 'https://assets-global.website-files.com/60dc0d5ebba157172984b158/65a65a1463fb3634600c68bd_12-JAN-2024-01.jpg'
        }
    ]
};

generatePDF(data, 'output.pdf')
    .then(() => {
        console.log('PDF generated successfully.');
    })
    .catch(error => {
        console.error('Error generating PDF:', error);
    });
