import React, { useState, useEffect } from 'react';

export const AssessmentPanel = ({ problemId, isTutor, studentId, peers = [] }) => {
    const [selfReleased, setSelfReleased] = useState(false);
    const [peerReleased, setPeerReleased] = useState(false);
    const [selfScore, setSelfScore] = useState('');
    const [selfComment, setSelfComment] = useState('');
    const [peerScores, setPeerScores] = useState({});
    const [error, setError] = useState(null);

    const toggleSelfAssessment = async () => {
        try {
            const res = await fetch(/api/v1/problems/ + problemId + /self-assessment-release, {
                method: 'PATCH',
                headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
            });
            if (res.ok) setSelfReleased(!selfReleased);
            else throw new Error('Falha na API');
        } catch (e) {
            setError('Erro ao alterar status');
        }
    };

    const submitSelfAssessment = async (e) => {
        e.preventDefault();
        try {
            const res = await fetch(/api/v1/problems/ + problemId + /self-assessment, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('token') },
                body: JSON.stringify({ score: parseFloat(selfScore), comment: selfComment })
            });
            if (!res.ok) throw new Error('Acesso negado ou erro');
            alert('Enviado com sucesso');
        } catch (e) {
            setError(e.message);
        }
    };

    const submitPeerAssessment = async (e) => {
        e.preventDefault();
        const payload = Object.keys(peerScores).map(id => ({
            targetId: id,
            score: parseFloat(peerScores[id].score),
            comment: peerScores[id].comment
        }));
        try {
            const res = await fetch(/api/v1/problems/ + problemId + /peer-assessments, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + localStorage.getItem('token') },
                body: JSON.stringify(payload)
            });
            if (!res.ok) throw new Error('Acesso negado ou erro');
            alert('Enviado com sucesso');
        } catch (e) {
            setError(e.message);
        }
    };

    return (
        <div>
            {error && <div id="toastNotification">{error}</div>}
            
            {isTutor && (
                <div>
                    <h3>Painel do Tutor</h3>
                    <button id={	oggleSelfAssessment_} onClick={toggleSelfAssessment}>
                        Toggle Autoavaliação
                    </button>
                    <span id="statusAssessmentLabel">
                        {selfReleased ? 'Avaliações Abertas' : 'Avaliações Fechadas'}
                    </span>
                </div>
            )}

            {!isTutor && selfReleased && (
                <form id="formSelfAssessment" onSubmit={submitSelfAssessment}>
                    <h3>Autoavaliação</h3>
                    <input type="number" id="inputSelfScore" step="0.1" value={selfScore} onChange={e => setSelfScore(e.target.value)} required />
                    <textarea id="inputSelfComment" value={selfComment} onChange={e => setSelfComment(e.target.value)} required />
                    <button type="submit" id="btnSubmitSelfAssessment">Enviar Autoavaliação</button>
                </form>
            )}

            {!isTutor && peerReleased && (
                <form onSubmit={submitPeerAssessment}>
                    <h3>Avaliação de Pares</h3>
                    <ul id="listPeerStudents">
                        {peers.map(peer => (
                            <li key={peer.id}>
                                {peer.name}
                                <input type="number" id={inputPeerScore_} step="0.1"
                                    onChange={e => setPeerScores({...peerScores, [peer.id]: {...peerScores[peer.id], score: e.target.value}})} required />
                                <textarea id={inputPeerComment_}
                                    onChange={e => setPeerScores({...peerScores, [peer.id]: {...peerScores[peer.id], comment: e.target.value}})} required />
                            </li>
                        ))}
                    </ul>
                    <button type="submit" id="btnSubmitPeerAssessment">Enviar Avaliação de Pares</button>
                </form>
            )}
        </div>
    );
};
