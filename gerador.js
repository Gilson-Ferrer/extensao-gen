document.addEventListener('DOMContentLoaded', () => {
    const btnAddTeam = document.querySelector('button:has(svg path[d="M12 4v16m8-8H4"])');
    const teamContainer = document.getElementById('teamContainer');
    const form = document.getElementById('extensionForm');
    const submitBtn = form.querySelector('button[type="submit"]');
    const caixaPdf = document.getElementById('caixa-pdf');
    const inputPdf = document.getElementById('input-pdf');
    const textoPdf = document.getElementById('texto-pdf');

    if (caixaPdf && inputPdf) {
        caixaPdf.addEventListener('click', () => inputPdf.click());
        
        inputPdf.addEventListener('change', (e) => {
            const qtd = e.target.files.length;
            if (qtd > 0) {
                textoPdf.textContent = `${qtd} arquivo(s) PDF selecionado(s)`;
                textoPdf.classList.replace('text-slate-400', 'text-blue-600');
            } else {
                textoPdf.textContent = 'Serão apensados ao final do relatório.';
                textoPdf.classList.replace('text-blue-600', 'text-slate-400');
            }
        });
    }

    btnAddTeam.addEventListener('click', () => {
        const newRow = document.createElement('div');
        newRow.className = 'flex flex-col md:flex-row gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200 items-center mt-3';
        newRow.innerHTML = `
            <div class="w-full md:flex-grow">
                <label class="block text-xs font-medium text-slate-500 mb-1">Nome do Integrante *</label>
                <input type="text" required placeholder="Nome completo" class="team-name w-full border border-slate-300 rounded-md px-3 py-2 text-sm">
            </div>
            <div class="w-full md:w-32">
                <label class="block text-xs font-medium text-slate-500 mb-1">RA *</label>
                <input type="text" required placeholder="Registro" class="team-ra w-full border border-slate-300 rounded-md px-3 py-2 text-sm">
            </div>
            <div class="w-full md:w-24">
                <label class="block text-xs font-medium text-slate-500 mb-1">Nota *</label>
                <input type="number" required placeholder="0 a 10" min="0" max="10" class="team-grade w-full border border-slate-300 rounded-md px-3 py-2 text-sm">
            </div>
            <button type="button" class="mt-5 text-red-500 hover:text-red-700 transition-colors remove-btn" title="Remover">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
            </button>
        `;

        newRow.querySelector('.remove-btn').addEventListener('click', () => newRow.remove());
        teamContainer.appendChild(newRow);
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const senhaDigitada = document.querySelector('input[type="password"]').value;
        const encoder = new TextEncoder();
        const dataBuffer = encoder.encode(senhaDigitada);
        const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHexDigitado = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        const hashCorreto = "cb7941e12449b5d9debe2af9a3f50c0056de65c7cd259af54a929da29afac4d8";

        if (hashHexDigitado !== hashCorreto) {
            alert("Senha da disciplina incorreta. Verifique com o professor para liberar o sistema.");
            return; 
        }

        const originalBtnText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span class="animate-pulse">Gerando Documento...</span>';
        submitBtn.disabled = true;

        try {
            const formData = extractFormData();
            await generatePDF(formData);
        } catch (error) {
            console.error("Erro na geração:", error);
            alert("Ocorreu um erro ao gerar o PDF. Verifique o console do navegador.");
        } finally {
            submitBtn.innerHTML = originalBtnText;
            submitBtn.disabled = false;
        }
    });
});

function extractFormData() {
    const data = {};

    const formatDateBr = (dataISO) => {
        if (!dataISO) return "";
        return dataISO.split('-').reverse().join('/');
    };

    data.professor = document.getElementById('input-professor')?.value || "";
    data.curso = document.querySelector('input[placeholder^="Ex: Análise"]')?.value || "";
    data.localData = document.querySelector('input[placeholder^="Ex: Carapicuíba"]')?.value || "";
    data.titulo = document.querySelector('input[placeholder^="Título oficial"]')?.value || "";
    data.instituicao = document.getElementById('input-instituicao')?.value || "Não se aplica";
    data.beneficiario = document.getElementById('input-beneficiario')?.value || ""; 
    data.dataInicio = formatDateBr(document.getElementById('input-data-inicio')?.value);
    data.dataFim = formatDateBr(document.getElementById('input-data-fim')?.value);
    data.publicoAlvo = document.getElementById('input-publico-alvo')?.value || "";
    data.qtdPessoas = document.getElementById('input-qtd-pessoas')?.value || "";
    data.repositorio = document.getElementById('input-repositorio')?.value || "Não aplicável";
    data.consentimento = document.getElementById('checkbox-consentimento')?.checked || false;
    const textareas = document.querySelectorAll('textarea');
    data.acao = textareas[0]?.value || "";
    data.etapas = textareas[1]?.value || "";
    data.resultados = textareas[2]?.value || "";
    data.bibliografia = document.getElementById('input-bibliografia')?.value || "";
    data.equipe = [];
    const teamRows = document.querySelectorAll('#teamContainer > div');
    teamRows.forEach(row => {
        const inputs = row.querySelectorAll('input');
        if (inputs.length >= 3) {
            data.equipe.push({ nome: inputs[0].value, ra: inputs[1].value, nota: inputs[2].value });
        }
    });

    data.imagens = document.querySelector('input[type="file"][accept="image/*"]')?.files;
    data.pdfs = document.getElementById('input-pdf')?.files;
    
    return data;
}


async function generatePDF(data) {
    const { PDFDocument, StandardFonts, rgb } = PDFLib;
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    const fontBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
    const margin = { top: 85, left: 85, right: 56, bottom: 56 };
    let currentPage = pdfDoc.addPage();
    const { width, height } = currentPage.getSize();
    let currentY = height - margin.top;

    const fontSize = 12;
    const lineHeight = 18;

    function checkPageBreak(requiredSpace = lineHeight) {
        if (currentY - requiredSpace < margin.bottom) {
            currentPage = pdfDoc.addPage();
            currentY = height - margin.top;
        }
    }

    function drawWrappedText(text, textFont, size, align = 'justify') {
        const maxWidth = width - margin.left - margin.right;
        const paragraphs = text.split('\n');

        for (const p of paragraphs) {
            const words = p.trim().split(/\s+/);
            if (words.length === 1 && words[0] === "") {
                currentY -= lineHeight;
                continue;
            }

            let line = '';
            for (let i = 0; i < words.length; i++) {
                const testLine = line + (line === '' ? '' : ' ') + words[i];
                const testWidth = textFont.widthOfTextAtSize(testLine, size);
                
                if (testWidth > maxWidth && line !== '') {
                    printLine(line, textFont, size, align, maxWidth, false);
                    line = words[i];
                } else {
                    line = testLine;
                }
            }
            if (line.trim().length > 0) {
                printLine(line, textFont, size, align, maxWidth, true);
            }
        }
    }

    function printLine(lineText, textFont, size, align, maxWidth, isLastLine) {
        checkPageBreak();
        const cleanText = lineText.trim();
        const textWidth = textFont.widthOfTextAtSize(cleanText, size);
        let x = margin.left;

        if (align === 'center') {
            x = margin.left + (maxWidth - textWidth) / 2;
            currentPage.drawText(cleanText, { x, y: currentY, size, font: textFont, color: rgb(0,0,0) });
        } else if (align === 'right') {
            x = width - margin.right - textWidth;
            currentPage.drawText(cleanText, { x, y: currentY, size, font: textFont, color: rgb(0,0,0) });
        } else if (align === 'justify' && !isLastLine && cleanText.includes(' ')) {

            const words = cleanText.split(' ');
            const totalWordsWidth = words.reduce((acc, word) => acc + textFont.widthOfTextAtSize(word, size), 0);
            const spaceBetweenWords = (maxWidth - totalWordsWidth) / (words.length - 1);
            
            let currentX = margin.left;
            for (const word of words) {
                currentPage.drawText(word, { x: currentX, y: currentY, size, font: textFont, color: rgb(0,0,0) });
                currentX += textFont.widthOfTextAtSize(word, size) + spaceBetweenWords;
            }
        } else {
            currentPage.drawText(cleanText, { x, y: currentY, size, font: textFont, color: rgb(0,0,0) });
        }
        currentY -= lineHeight;
    }

    try {
        const logoUrl = 'logo.png'; 
        const logoBytes = await fetch(logoUrl).then(res => res.arrayBuffer());
        const logoImage = await pdfDoc.embedPng(logoBytes);

        const logoDims = logoImage.scaleToFit(80, 80); 
        currentPage.drawImage(logoImage, {
            x: margin.left + (width - margin.left - margin.right - logoDims.width) / 2,
            y: currentY - logoDims.height,
            width: logoDims.width,
            height: logoDims.height,
        });
        currentY -= (logoDims.height + 25);
    } catch (e) {
        console.warn("Logo 'logo.png' não encontrado no diretório. Gerando capa sem logotipo.");
        currentY -= 40; 
    }

    drawWrappedText("UNIVERSIDADE ESTÁCIO DE CARAPICUÍBA", fontBold, 14, 'center');
    currentY -= 15;
    drawWrappedText("RELATÓRIO DE EXTENSÃO ACADÊMICA", fontBold, 14, 'center');

    currentY -= 80; 
    
    drawWrappedText(`Curso: ${data.curso.toUpperCase()}`, fontBold, 12, 'center');

    currentY -= 20; 
    drawWrappedText(data.titulo.toUpperCase(), fontBold, 14, 'center');

    currentY -= 90;
    
    drawWrappedText(`Professor(a): ${data.professor}`, font, 12, 'center');
    currentY -= 40;

    if (data.equipe.length > 0) {
        drawWrappedText(`${data.equipe[0].nome} RA: ${data.equipe[0].ra}`, font, 12, 'center');
        for(let i = 1; i < data.equipe.length; i++) {
            currentY -= 5;
            drawWrappedText(`${data.equipe[i].nome} RA: ${data.equipe[i].ra}`, font, 12, 'center');
        }
    }

    currentY = margin.bottom + 20;
    drawWrappedText(data.localData, font, 12, 'center');
    currentPage = pdfDoc.addPage();
    currentY = height - margin.top;

    drawWrappedText("1. DADOS DA AÇÃO E BENEFICIÁRIOS", fontBold, 12, 'left');
    currentY -= 5;
    drawWrappedText(`Instituição Parceira: ${data.instituicao}`, font, 12, 'left');
    drawWrappedText(`Nome do Beneficiário: ${data.beneficiario}`, font, 12, 'left');
    drawWrappedText(`Período de Realização: ${data.dataInicio} a ${data.dataFim}`, font, 12, 'left');
    drawWrappedText(`Público-Alvo: ${data.publicoAlvo} - ${data.qtdPessoas} pessoa(s) atendida(s)`, font, 12, 'left');
    
    currentY -= 25;

    drawWrappedText("2. DESENVOLVIMENTO DO PROJETO", fontBold, 12, 'left');
    currentY -= 15;
    
    drawWrappedText("2.1. Descrição da Ação", fontBold, 12, 'left');
    currentY -= 5;
    drawWrappedText(data.acao, font, 12, 'justify');
    currentY -= 10;

    drawWrappedText("2.2. Etapas Realizadas", fontBold, 12, 'left');
    currentY -= 5;
    drawWrappedText(data.etapas, font, 12, 'justify');
    currentY -= 10;

    drawWrappedText("2.3. Resultados Alcançados", fontBold, 12, 'left');
    currentY -= 5;
    drawWrappedText(data.resultados, font, 12, 'justify');
    currentY -= 25;

    drawWrappedText("3. REPOSITÓRIO E LINKS EXTERNOS", fontBold, 12, 'left');
    currentY -= 10; 

    if (data.repositorio && data.repositorio.trim() !== "") {

        drawWrappedText(`Link de acesso: ${data.repositorio}`, font, 11, 'left');
    } else {
        drawWrappedText("Nenhum link ou repositório externo foi vinculado a este projeto.", font, 11, 'left');
    }

    currentY -= 30;

    if (data.bibliografia && data.bibliografia.trim() !== "") {
        drawWrappedText("4. REFERÊNCIAS BIBLIOGRÁFICAS", fontBold, 12, 'left');
        currentY -= 5;
        drawWrappedText(data.bibliografia, font, 12, 'justify');
        currentY -= 25;
    }

    drawWrappedText("5. AUTOAVALIAÇÃO", fontBold, 12, 'left');
    currentY -= 10;
    data.equipe.forEach(membro => {
        drawWrappedText(`• ${membro.nome} (RA: ${membro.ra}) — Nota Atribuída: ${membro.nota}`, font, 12, 'left');
    });
    currentY -= 25;

    if (data.consentimento) {
        drawWrappedText("6. TERMO DE CONSENTIMENTO E VERACIDADE", fontBold, 12, 'left');
        currentY -= 10;
        const textoTermo = "Os autores declaram que os dados e resultados apresentados neste relatório são autênticos e de autoria própria. Declaram ainda que possuem a devida autorização prévia da instituição parceira ou beneficiário para a condução das atividades descritas, bem como para a coleta, registro e utilização das informações e imagens para fins estritamente acadêmicos, de avaliação e documentação no âmbito da disciplina.";
        drawWrappedText(textoTermo, font, 12, 'justify');
        currentY -= 30;
    }

    const espacoAssinaturas = 30 + (data.equipe.length * 40) + 45 + 10;

    if ((currentY - espacoAssinaturas) < margin.bottom) {

        currentPage = pdfDoc.addPage();
        currentY = height - margin.top;
    }

    drawWrappedText("7. ASSINATURAS", fontBold, 12, 'left');
    currentY -= 30;

    data.equipe.forEach(membro => {
        drawWrappedText("________________________________________________________", font, 12, 'center');
        currentY -= 5;
        drawWrappedText(`${membro.nome} RA: ${membro.ra}`, font, 12, 'center');
        currentY -= 35;
    });

    drawWrappedText("___________________________________________________", font, 12, 'center');
    currentY -= 5;
    drawWrappedText(`Beneficiário: ${data.beneficiario}`, fontBold, 10, 'center');
    currentY -= 40;

    if (data.imagens.length > 0) {
        checkPageBreak(height); 
        drawWrappedText("ANEXOS E EVIDÊNCIAS", fontBold, 14, 'center');
        currentY -= 30;

        for (const file of data.imagens) {
            try {
                const imgBuffer = await file.arrayBuffer();
                let pdfImage;

                if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
                    pdfImage = await pdfDoc.embedJpg(imgBuffer);
                } else if (file.type === 'image/png') {
                    pdfImage = await pdfDoc.embedPng(imgBuffer);
                } else {
                    continue; 
                }

                const imgDims = pdfImage.scaleToFit(width - margin.left - margin.right, 300);
                checkPageBreak(imgDims.height + 20);

                currentPage.drawImage(pdfImage, {
                    x: margin.left + (width - margin.left - margin.right - imgDims.width) / 2, 
                    y: currentY - imgDims.height,
                    width: imgDims.width,
                    height: imgDims.height,
                });
                currentY -= (imgDims.height + 30);
            } catch (e) {
                console.error("Erro ao processar imagem", e);
            }
        }
    }

    if (data.pdfs && data.pdfs.length > 0) {
        for (const file of data.pdfs) {
            try {
                const pdfBuffer = await file.arrayBuffer();
                const externalPdf = await PDFDocument.load(pdfBuffer);

                const copiedPages = await pdfDoc.copyPages(externalPdf, externalPdf.getPageIndices());

                copiedPages.forEach((page) => {
                    pdfDoc.addPage(page);
                });
            } catch (error) {
                console.error(`Erro ao anexar o documento PDF ${file.name}:`, error);
            }
        }
    }

    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify(data) + Date.now()));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    const pages = pdfDoc.getPages();
    pages.forEach(page => {
        page.drawText(`${hashHex.substring(0,40)}`, {
            x: margin.left,
            y: 20,
            size: 8,
            font: font,
            color: rgb(0.5, 0.5, 0.5)
        });
    });

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Relatorio_Extensao_${data.equipe[0]?.nome.replace(/\s/g, '_') || 'AsyncX'}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function configurarRemocaoArquivos(inputId, listId) {
    const input = document.getElementById(inputId);
    const list = document.getElementById(listId);

    if (!input || !list) return;

    input.addEventListener('change', function() {
        atualizarInterfaceLista(input, list);
    });
}

function atualizarInterfaceLista(input, list) {
    list.innerHTML = '';

    Array.from(input.files).forEach((file, index) => {
        const li = document.createElement('li');
        li.className = 'flex justify-between items-center bg-slate-100 px-3 py-2 rounded-lg text-sm text-slate-600 border border-slate-200';

        const nomeArquivo = document.createElement('span');
        nomeArquivo.className = 'truncate pr-4 font-medium';
        nomeArquivo.textContent = file.name;

        const btnRemover = document.createElement('button');
        btnRemover.type = 'button';
        btnRemover.className = 'text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full w-6 h-6 flex items-center justify-center font-bold transition-colors focus:outline-none';
        btnRemover.innerHTML = '✕';
        btnRemover.title = "Remover arquivo";

        btnRemover.onclick = (e) => {
            e.preventDefault(); 
            e.stopPropagation(); 
            removerArquivoDoInput(input, index, list);
        };
        
        li.appendChild(nomeArquivo);
        li.appendChild(btnRemover);
        list.appendChild(li);
    });
}

function removerArquivoDoInput(input, indiceParaRemover, list) {

    const dt = new DataTransfer();
    
    Array.from(input.files).forEach((file, index) => {
        if (index !== indiceParaRemover) {
            dt.items.add(file); 
        }
    });
    
    input.files = dt.files; 
    atualizarInterfaceLista(input, list); 
}

document.addEventListener('DOMContentLoaded', () => {
    configurarRemocaoArquivos('input-imagens', 'lista-imagens');
    configurarRemocaoArquivos('input-pdf', 'lista-pdfs');
});