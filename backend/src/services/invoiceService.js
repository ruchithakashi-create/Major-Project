const PDFDocument = require('pdfkit');

class InvoiceService {
  /**
   * Generate next invoice number e.g. UNF-2026-0042
   */
  generateInvoiceNumber() {
    const year = new Date().getFullYear();
    const random = Math.floor(1000 + Math.random() * 9000);
    return `UNF-${year}-${random}`;
  }

  /**
   * Build a GST invoice PDF and return as Buffer
   */
  async generateInvoicePDF({ payment, therapist, client, itemDescription }) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 40, size: 'A4' });
        const buffers = [];

        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });

        // Header & Branding
        doc
          .fillColor('#134e4a') // Calming teal
          .fontSize(22)
          .font('Helvetica-Bold')
          .text('TAX INVOICE', 40, 40);

        doc
          .fillColor('#64748b')
          .fontSize(10)
          .font('Helvetica')
          .text('Platform: UNFAZED Healthcare Solutions (India)', 40, 68)
          .text(`Invoice No: ${payment.invoiceNumber || 'UNF-DRAFT'}`, 40, 82)
          .text(`Date: ${new Date(payment.createdAt).toLocaleDateString('en-IN')}`, 40, 96)
          .text(`Payment Ref: ${payment.paymentId || 'ONLINE-PAY'}`, 40, 110);

        // Therapist (Provider) Box
        doc
          .fillColor('#0f172a')
          .fontSize(12)
          .font('Helvetica-Bold')
          .text('PRACTICE / PROVIDER DETAILS', 40, 140);

        doc
          .fillColor('#334155')
          .fontSize(10)
          .font('Helvetica')
          .text(`${therapist.name} (${therapist.title || 'Clinical Psychologist'})`, 40, 158)
          .text(`Registration: ${therapist.registrationNumber || 'RCI Verified'}`, 40, 172)
          .text(`Email: ${therapist.email}`, 40, 186)
          .text(`Location: ${therapist.location?.city || 'Bengaluru'}, ${therapist.location?.state || 'Karnataka'}, India`, 40, 200);

        // Client (Billed To) Box
        doc
          .fillColor('#0f172a')
          .fontSize(12)
          .font('Helvetica-Bold')
          .text('BILLED TO', 320, 140);

        doc
          .fillColor('#334155')
          .fontSize(10)
          .font('Helvetica')
          .text(`Client Name: ${client.name}`, 320, 158)
          .text(`Email: ${client.email}`, 320, 172)
          .text(`Phone: ${client.phone || 'N/A'}`, 320, 186)
          .text(`Country: India`, 320, 200);

        // Divider
        doc.moveTo(40, 225).lineTo(550, 225).strokeColor('#cbd5e1').stroke();

        // Table Header
        doc.rect(40, 235, 510, 25).fill('#f1f5f9');
        doc
          .fillColor('#0f172a')
          .fontSize(10)
          .font('Helvetica-Bold')
          .text('Description', 50, 242)
          .text('SAC Code', 280, 242)
          .text('Qty', 370, 242)
          .text('Amount (INR)', 450, 242, { align: 'right', width: 90 });

        // Line Item
        const gross = payment.amount || 1500;
        // 18% GST (9% CGST + 9% SGST) calculation
        const baseAmount = Math.round((gross / 1.18) * 100) / 100;
        const totalGst = Math.round((gross - baseAmount) * 100) / 100;
        const cgst = Math.round((totalGst / 2) * 100) / 100;
        const sgst = Math.round((totalGst / 2) * 100) / 100;

        doc
          .fillColor('#334155')
          .fontSize(10)
          .font('Helvetica')
          .text(itemDescription || 'Tele-consultation Clinical Psychotherapy Session', 50, 275)
          .text('998311', 280, 275)
          .text('1', 370, 275)
          .text(`Rs. ${baseAmount.toFixed(2)}`, 450, 275, { align: 'right', width: 90 });

        // Subtotal, Taxes and Grand Total
        doc.moveTo(40, 310).lineTo(550, 310).strokeColor('#e2e8f0').stroke();

        let y = 325;
        doc.text('Taxable Value:', 330, y).text(`Rs. ${baseAmount.toFixed(2)}`, 450, y, { align: 'right', width: 90 });
        y += 18;
        doc.text('CGST (9%):', 330, y).text(`Rs. ${cgst.toFixed(2)}`, 450, y, { align: 'right', width: 90 });
        y += 18;
        doc.text('SGST (9%):', 330, y).text(`Rs. ${sgst.toFixed(2)}`, 450, y, { align: 'right', width: 90 });
        y += 24;

        doc.rect(320, y - 5, 230, 30).fill('#e6fffa');
        doc
          .fillColor('#0d9488')
          .fontSize(12)
          .font('Helvetica-Bold')
          .text('TOTAL PAID:', 330, y + 2)
          .text(`Rs. ${gross.toFixed(2)}`, 450, y + 2, { align: 'right', width: 90 });

        // Footer note
        doc
          .fillColor('#94a3b8')
          .fontSize(8)
          .font('Helvetica')
          .text(
            'This is an electronically generated tax invoice issued via UNFAZED Therapist SaaS. Valid without signature under IT Act 2000.',
            40,
            500,
            { align: 'center', width: 510 }
          );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}

module.exports = new InvoiceService();
