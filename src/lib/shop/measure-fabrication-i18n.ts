// Translate domain diagnostics at the presentation boundary; retain custom member names.
const STR = {
  en: {
    role0: 'Top rail',
    role1: 'Second top rail',
    role2: 'Pickets',
    role3: 'Bottom rail',
    role4: 'Posts',
    role5: 'Newel posts',
    role6: 'Frame',
    role7: 'Grate bearing bars',
    role8: 'Grate crossbars',
    role9: 'Ladder / stair stringers',
    role10: 'Ladder rungs',
    role11: 'Handrail',
    role12: 'Other member',

    planWidth: 'in plan width',
    checkProfile: 'full profile must be checked',
    buttEnds: 'square butt ends',
    endClearance: 'in clearance at each end',

    message0: "Enter positive measured dimensions and an explicit end gap (0 when intended).",
    message1: "Member widths, gaps or spacing exceed the supported range.",
    message2: "Members and end gaps do not fit inside the measured overall size.",
    message3: "This assembly exceeds 100 bars or rungs. Split it into measured sections.",
    message4: "The selected bars or rungs overlap. Check spacing and member width.",
    message5: "Source member is unresolved. Check its measurements.",
    message6: "Catalog size does not match the measured section. Apply its size to the drawing or choose a matching material, then recheck.",
    message7: "Enter a finished cut length and quantity for every line.",
    message8: "Split schedules exceeding 10,000 pieces.",
    message9: "Add cut lengths.",
    message10: "Enter saw kerf and end trim in inches (enter 0 only when intended).",
    message11: "Choose a catalog material.",
    message12: "Sheet/each materials need a separate area or item takeoff; not counted as bars.",
    message13: "Check the selected profile and cut dimensions.",
    message14: "Enter a usable stock length.",
    message15: "A piece exceeds usable stock length. Choose longer stock or detail a joint.",
    message16: "This measured member is already assigned. Remove the duplicate assignment.",
    message17: "Takeoff exceeds 10,000 pieces. Split the schedule.",
  },
  pt: {
    role0: 'Travessa superior',
    role1: 'Segunda travessa superior',
    role2: 'Balaústres',
    role3: 'Travessa inferior',
    role4: 'Postes',
    role5: 'Postes de arranque',
    role6: 'Quadro',
    role7: 'Barras portantes da grelha',
    role8: 'Travessas da grelha',
    role9: 'Longarinas de escada',
    role10: 'Degraus da escada vertical',
    role11: 'Corrimão',
    role12: 'Outra peça',

    planWidth: 'pol. de largura em planta',
    checkProfile: 'conferir o perfil completo',
    buttEnds: 'pontas retas de topo',
    endClearance: 'pol. de folga em cada ponta',

    message0: "Informe medidas positivas e a folga nas pontas (0 quando previsto).",
    message1: "Larguras das peças, folgas ou espaçamentos excedem o intervalo permitido.",
    message2: "As peças e folgas nas pontas não cabem nas dimensões totais medidas.",
    message3: "Este conjunto excede 100 barras ou degraus. Divida em seções medidas.",
    message4: "As barras ou degraus se sobrepõem. Confira o espaçamento e a largura das peças.",
    message5: "A peça de origem está pendente. Confira suas medidas.",
    message6: "A medida do catálogo não corresponde à seção medida. Aplique a medida ao desenho ou escolha um material compatível e confira novamente.",
    message7: "Informe o comprimento final de corte e a quantidade em cada linha.",
    message8: "Divida listas com mais de 10.000 peças.",
    message9: "Adicione os comprimentos de corte.",
    message10: "Informe a largura do corte da serra e a sobra para aparar em polegadas (0 somente quando previsto).",
    message11: "Escolha um material do catálogo.",
    message12: "Chapas e itens por unidade exigem cálculo separado de área ou quantidade; não entram como barras.",
    message13: "Confira o perfil selecionado e as medidas dos cortes.",
    message14: "Informe um comprimento útil de barra.",
    message15: "Uma peça excede o comprimento útil da barra. Escolha uma barra maior ou detalhe uma emenda.",
    message16: "Esta peça medida já tem material atribuído. Remova a atribuição duplicada.",
    message17: "O cálculo excede 10.000 peças. Divida a lista.",
  },
  es: {
    role0: 'Travesaño superior',
    role1: 'Segundo travesaño superior',
    role2: 'Barrotes',
    role3: 'Travesaño inferior',
    role4: 'Postes',
    role5: 'Postes de arranque',
    role6: 'Marco',
    role7: 'Barras portantes de rejilla',
    role8: 'Travesaños de rejilla',
    role9: 'Largueros de escalera',
    role10: 'Peldaños de escalera vertical',
    role11: 'Pasamanos',
    role12: 'Otra pieza',

    planWidth: 'pulg. de ancho en planta',
    checkProfile: 'verificar el perfil completo',
    buttEnds: 'extremos rectos a tope',
    endClearance: 'pulg. de holgura en cada extremo',

    message0: "Introduzca medidas positivas y la holgura en los extremos (0 cuando corresponda).",
    message1: "Los anchos de las piezas, holguras o separaciones exceden el intervalo permitido.",
    message2: "Las piezas y holguras de los extremos no caben en las dimensiones totales medidas.",
    message3: "Este conjunto excede 100 barras o peldaños. Divídalo en secciones medidas.",
    message4: "Las barras o peldaños se superponen. Revise la separación y el ancho de las piezas.",
    message5: "La pieza de origen está pendiente. Revise sus medidas.",
    message6: "La medida del catálogo no coincide con la sección medida. Aplique la medida al dibujo o elija un material compatible y vuelva a verificar.",
    message7: "Introduzca la longitud final de corte y la cantidad en cada línea.",
    message8: "Divida las listas con más de 10.000 piezas.",
    message9: "Añada las longitudes de corte.",
    message10: "Introduzca el ancho de corte de la sierra y el recorte de extremos en pulgadas (0 solo cuando corresponda).",
    message11: "Elija un material del catálogo.",
    message12: "Las chapas y los artículos por unidad requieren un cálculo separado de área o cantidad; no se cuentan como barras.",
    message13: "Revise el perfil seleccionado y las medidas de los cortes.",
    message14: "Introduzca una longitud útil de barra.",
    message15: "Una pieza excede la longitud útil de la barra. Elija una barra más larga o detalle un empalme.",
    message16: "Esta pieza medida ya tiene material asignado. Quite la asignación duplicada.",
    message17: "El cálculo excede 10.000 piezas. Divida la lista.",
  },
};
export function fabricationText(lang: string, text: string): string {
 const target = STR[lang === 'pt' ? 'pt' : lang === 'es' ? 'es' : 'en'];
 for (const key of Object.keys(STR.en) as (keyof typeof STR.en)[]) {
  const english = STR.en[key];
  if (text === english) return target[key];
  if (text.endsWith(`: ${english}`)) return text.slice(0, -english.length) + target[key];
 }
 const profile=text.match(/^([\d.]+) in plan width; (full profile must be checked|square butt ends|[\d.]+ in clearance at each end)$/);
 if(profile){
  const tail=profile[2]==='full profile must be checked'?target.checkProfile:profile[2]==='square butt ends'?target.buttEnds:`${profile[2].split(' ')[0]} ${target.endClearance}`;
  return `${profile[1]} ${target.planWidth}; ${tail}`;
 }
 return text;
}
