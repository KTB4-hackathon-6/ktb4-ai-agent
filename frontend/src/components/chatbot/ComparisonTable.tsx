import { comparisonRows } from '../../mocks/chatbot'

/**
 * ILLO_SERVICE_SPEC 4.3 결과 확인
 * 계약서, 사용자 설명, 급여명세서의 값을 출처와 함께 나란히 두고 차이가 있는 줄만 표시한다.
 */
function ComparisonTable() {
  return (
    <div className="comparison">
      <table className="comparison-table">
        <caption className="sr-only">계약서, 사용자 설명, 급여명세서 비교</caption>
        <thead>
          <tr>
            <th scope="col">항목</th>
            <th scope="col">계약서</th>
            <th scope="col">사용자 설명</th>
            <th scope="col">급여명세서</th>
          </tr>
        </thead>
        <tbody>
          {comparisonRows.map((row) => (
            <tr className={row.flagged ? 'flagged' : undefined} key={row.id}>
              <th scope="row">
                {row.ko}
                <small>{row.en}</small>
              </th>
              <td>{row.contract}</td>
              <td>{row.user}</td>
              <td>{row.payslip}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="comparison-note">
        색이 들어간 줄은 세 자료의 값이 서로 다른 항목입니다.
        <small>Tinted rows are where the three sources disagree.</small>
      </p>
    </div>
  )
}

export default ComparisonTable
